CREATE STREAM "DESTINATION_SQL_STREAM"( 
    MetricType VARCHAR(16), 
    EventTimestamp BIGINT, 
    MetricItem VARCHAR(1024),  
    UnitValueInt BIGINT,  
    UnitValueFloat DOUBLE);  

--Active Visitors
CREATE OR REPLACE PUMP "VISTOR_COUNTER_PUMP" AS
INSERT INTO "DESTINATION_SQL_STREAM" ( MetricType, EventTimestamp, UnitValueInt)
SELECT STREAM 'visitor_count', UNIX_TIMESTAMP(weblogs.window_time), COUNT(weblogs.clientid) FROM (
    SELECT STREAM DISTINCT
        monotonic (STEP (CHAR_TO_TIMESTAMP('dd/MMM/yyyy:HH:mm:ss z',"WASA_001"."datetime") by INTERVAL '60' SECOND)) AS window_time,
        STEP ("WASA_001".ROWTIME BY INTERVAL '60' SECOND),
        "WASA_001"."clientid" as clientid
    FROM "WASA_001") as weblogs
    GROUP BY
    window_time;

--"Top" Page Views (group_rank?)
CREATE OR REPLACE PUMP "PAGEVIEWS_PUMP" AS
INSERT INTO "DESTINATION_SQL_STREAM" ( MetricType, EventTimestamp, MetricItem, UnitValueInt)
SELECT 'top_pages', UNIX_TIMESTAMP(eventTimestamp), page, page_count FROM (
    SELECT stream 
        weblogs."page" as page,
        count(*) as page_count,
        STEP (CHAR_TO_TIMESTAMP('dd/MMM/yyyy:HH:mm:ss z',weblogs."datetime") by INTERVAL '10' SECOND) as eventTimestamp
    FROM "WASA_001" weblogs
    GROUP BY 
        STEP (weblogs.ROWTIME BY INTERVAL '10' SECOND),
        STEP (CHAR_TO_TIMESTAMP('dd/MMM/yyyy:HH:mm:ss z',weblogs."datetime") by INTERVAL '10' SECOND),
        weblogs."page"
    HAVING count(*) > 1
    ORDER BY STEP (weblogs.ROWTIME BY INTERVAL '10' SECOND), page_count desc
);

-- Events -- 
CREATE STREAM "EVENT_STREAM"( 
    MetricType VARCHAR(16), 
    EventTimestamp BIGINT,  
    MetricItem VARCHAR(1024),
    UnitValueInt BIGINT);  
CREATE OR REPLACE PUMP "SHARED_EVENT_PUMP" AS
INSERT INTO "EVENT_STREAM" ( MetricType, EventTimestamp, MetricItem, UnitValueInt)
SELECT 'event_count', UNIX_TIMESTAMP(eventTimestamp), event, event_count FROM (
    SELECT STREAM
        STEP (CHAR_TO_TIMESTAMP('dd/MMM/yyyy:HH:mm:ss z',weblogs."datetime") by INTERVAL '10' SECOND) as eventTimestamp,
        weblogs."event" event,
        count(*) event_count
    FROM "WASA_001" weblogs
    GROUP BY 
        weblogs."event",
        STEP (CHAR_TO_TIMESTAMP('dd/MMM/yyyy:HH:mm:ss z',weblogs."datetime") by INTERVAL '10' SECOND),
        STEP (weblogs.ROWTIME BY INTERVAL '10' SECOND)
);

CREATE OR REPLACE PUMP "EVENT_PUMP" AS
INSERT INTO "DESTINATION_SQL_STREAM" (MetricType, EventTimestamp, MetricItem, UnitValueInt)
SELECT STREAM MetricType, EventTimestamp, MetricItem, UnitValueInt FROM "EVENT_STREAM";

--Anomaly detection for event distribution
CREATE STREAM "ANOMALY_TEMP_STREAM"( 
    EventTimestampString VARCHAR(16), 
    MetricItem VARCHAR(1024),
    MetricItemInt INTEGER,
    UnitValueInt BIGINT,  
    AnomalyScore DOUBLE);  
CREATE OR REPLACE PUMP "INTERMEDIATE_ANOMALY_EVENT_PUMP" AS
INSERT INTO "ANOMALY_TEMP_STREAM" ( EventTimestampString, MetricItem, MetricItemInt, UnitValueInt, AnomalyScore)
SELECT STREAM *
FROM TABLE (
    RANDOM_CUT_FOREST(
        CURSOR(SELECT STREAM 
            CAST(EventTimestamp AS VARCHAR(16)),
            MetricItem,
            case MetricItem
            WHEN 'click' THEN 1
            WHEN 'pageview' THEN 2
            WHEN 'conversion' THEN 3
            WHEN 'exception' THEN 4
            WHEN 'playvideo' THEN 5
            WHEN 'login' THEN 6
            WHEN 'logoff' THEN 7
            ELSE 0
            END, 
            UnitValueInt FROM "EVENT_STREAM"),
            100,
            256,
            100000,
            1)
    );

CREATE OR REPLACE PUMP "ANOMALY_EVENT_PUMP" AS
INSERT INTO "DESTINATION_SQL_STREAM" (MetricType, EventTimestamp, MetricItem, UnitValueFloat)
SELECT 'event_anomaly', CAST(EventTimestampString AS BIGINT), MetricItem || ':' || CAST(UnitValueInt as VARCHAR(16)), AnomalyScore FROM (
    SELECT STREAM 
        EventTimestampString,
        MetricItem,
        UnitValueInt,
        AnomalyScore
    FROM "ANOMALY_TEMP_STREAM"
    WHERE AnomalyScore > 2.0
);

--agents
CREATE OR REPLACE PUMP "AGENT_PUMP" AS
INSERT INTO "DESTINATION_SQL_STREAM" ( MetricType, EventTimestamp, MetricItem, UnitValueInt)
SELECT 'agent_count', UNIX_TIMESTAMP(eventTimestamp), agent, agent_count FROM (
    SELECT STREAM 
        weblogs."agent" as agent,
        count(*) as agent_count,
        STEP (weblogs.ROWTIME BY INTERVAL '10' SECOND) as eventTimestamp
    FROM "WASA_001" weblogs
    GROUP BY 
        weblogs."agent",
        STEP (weblogs.ROWTIME BY INTERVAL '10' SECOND)
);

--referrer (-r) list
CREATE OR REPLACE PUMP "REFERRER_PUMP" AS
INSERT INTO "DESTINATION_SQL_STREAM" ( MetricType, EventTimestamp, MetricItem, UnitValueInt)
SELECT 'referral_count', UNIX_TIMESTAMP(eventTimestamp), referrer, referrer_count FROM (
    SELECT stream 
        weblogs."referrer" as referrer,
        count(*) as referrer_count,
        STEP (CHAR_TO_TIMESTAMP('dd/MMM/yyyy:HH:mm:ss z',weblogs."datetime") by INTERVAL '10' SECOND) as eventTimestamp
    FROM "WASA_001" weblogs
    GROUP BY 
        STEP (weblogs.ROWTIME BY INTERVAL '10' SECOND),
        STEP (CHAR_TO_TIMESTAMP('dd/MMM/yyyy:HH:mm:ss z',weblogs."datetime") by INTERVAL '10' SECOND),
        weblogs."referrer"
    ORDER BY STEP (weblogs.ROWTIME BY INTERVAL '10' SECOND), referrer_count desc
);

--Hourly Events
CREATE OR REPLACE PUMP "HOURLY_EVENT_PUMP" AS
INSERT INTO "DESTINATION_SQL_STREAM" ( MetricType, EventTimestamp, MetricItem, UnitValueInt)
SELECT 'hourly_events', EventTimestamp, MetricItem, hourly_total FROM (
    SELECT STREAM 
        SUM(UnitValueInt) OVER hourly_window as hourly_total,
        MetricItem,
        EventTimestamp
    FROM "EVENT_STREAM"
    WINDOW hourly_window AS (
        PARTITION BY MetricItem 
            RANGE INTERVAL '1' HOUR PRECEDING 
    )
);
