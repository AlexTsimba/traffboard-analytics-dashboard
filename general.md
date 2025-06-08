# General Overview

## Aggregated KPIs (displayed on Overview tab)
- **Total Unique Clicks:** SUM(unique_clicks) from Traffic Reports data.
- **Total Registrations:** SUM(registrations_count) from Traffic Reports data.
- **Total FTD Count:** SUM(ftd_count) from Traffic Reports data.
- **Total FTD Sum:** SUM(ftd_sum) from Players data.
- **Total Deposits Count:** SUM(deposits_count) from Players data.
- **Total Deposits Sum:** SUM(deposits_sum) from Players data.
- **Total Cashouts Count:** SUM(cashouts_count) from Players data.
- **Total Cashouts Sum:** SUM(cashouts_sum) from Players data.
- **Total Casino Bets Count:** SUM(casino_bets_count) from Players data.
- **Total Casino Real NGR:** SUM(casino_real_ngr) from Players data.
- **Total Casino Wins Sum:** SUM(casino_wins_sum) from Players data.
- **Number of Prequalified Players:** COUNT of players where prequalified=true.
- **Total Cost:** SUM(fixed_per_player) for Prequalified players only.

## Calculated KPIs
- **ARPU:** (Total Deposits Sum - Total Cashouts Sum) / Total Registrations.
- **ARPPU:** (Total Deposits Sum - Total Cashouts Sum) / Number of players with deposits_count > 0.
- **Dep2Cost:** Total Deposits Sum / Total Cost.
- **ROI:** (Total Casino Real NGR - Total Cost) / Total Cost.

## Visual Elements
- Cards for absolute metrics.
- Horizontal bar chart: FTD Count by Partner.
- Line chart (daily) with stacked area chart for traffic breakdown by source and sub2.

## Filters
- Partner, Campaign, Landing, Brand, OS, Country, Date Range.
- Device Type, User Agent, Source / sub2 filters (via lookup join).
