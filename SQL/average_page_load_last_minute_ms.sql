-- average page load for all pages over last minute
CREATE OR REPLACE PUMP "PAGELOAD_PUMP" AS
INSERT INTO "DESTINATION_SQL_STREAM" ( MetricType, EventTimestamp, MetricItem, UnitValueInt)
SELECT 'avg_pg_ld', UNIX_TIMESTAMP(eventTimestamp), MetricItem, average_ms FROM (
    SELECT STREAM 
        'All Pages' as MetricItem,
        AVG(weblogs."custom_metric_int_value") as average_ms,
        STEP (CHAR_TO_TIMESTAMP('dd/MMM/yyyy:HH:mm:ss z',weblogs."datetime") by INTERVAL '60' SECOND) as eventTimestamp
    FROM "WASA_001" weblogs
    WHERE weblogs."custom_metric_name" = 'page_load_time'
    GROUP BY 
        STEP (CHAR_TO_TIMESTAMP('dd/MMM/yyyy:HH:mm:ss z',weblogs."datetime") by INTERVAL '60' SECOND),
        STEP (weblogs.ROWTIME BY INTERVAL '60' SECOND)
);