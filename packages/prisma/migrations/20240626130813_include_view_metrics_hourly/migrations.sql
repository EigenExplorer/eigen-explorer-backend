-- CreateView
CREATE OR REPLACE VIEW "view_hourly_deposit_data" AS
SELECT
    date_trunc('hour', d."createdAt") AS timestamp,
    d."strategyAddress",
    COUNT(*) AS total_count,
    SUM(CAST(shares AS numeric)) AS total_shares
FROM
    "Deposit" d
GROUP BY
    date_trunc('hour', d."createdAt"),
    d."strategyAddress"
ORDER BY
    timestamp DESC,
    d."strategyAddress";

-- CreateView
CREATE OR REPLACE VIEW "view_hourly_withdrawal_data" AS
WITH unnested AS (
    SELECT
        date_trunc('hour', c."createdAt") AS timestamp,
        unnest(q."strategies") AS strategy,
        unnest(q."shares") AS share
    FROM
        "WithdrawalCompleted" c
    JOIN
        "WithdrawalQueued" q
    ON
        c."withdrawalRoot" = q."withdrawalRoot"
    WHERE
        c."receiveAsTokens" = true
    )
SELECT
    timestamp,
    strategy,
    COUNT(*) AS total_count,
    SUM(CAST(share AS numeric)) AS total_shares
FROM
    unnested
GROUP BY
    timestamp,
    strategy
ORDER BY
    timestamp DESC,
    strategy;
