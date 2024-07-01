-- CreateView
CREATE OR REPLACE VIEW "viewHourlyDepositData" AS
SELECT
    date_trunc('hour', d."createdAt") AS timestamp,
    d."strategyAddress",
    COUNT(*) AS "totalDeposits",
    SUM(CAST(shares AS numeric)) AS "totalShares"
FROM
    "Deposit" d
GROUP BY
    date_trunc('hour', d."createdAt"),
    d."strategyAddress"
ORDER BY
    timestamp DESC,
    d."strategyAddress";

-- CreateView
CREATE OR REPLACE VIEW "viewHourlyWithdrawalData" AS
WITH unnested AS (
    SELECT
        date_trunc('hour', c."createdAt") AS timestamp,
        unnest(q."strategies") AS "strategyAddress",
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
    "strategyAddress",
    COUNT(*) AS "totalWithdrawals",
    SUM(CAST(share AS numeric)) AS "totalShares"
FROM
    unnested
GROUP BY
    timestamp,
    "strategyAddress"
ORDER BY
    timestamp DESC,
    "strategyAddress";
