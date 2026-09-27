# Basis — local quant practice

v1.5.0: GitHub Pages/static subpage packaging, browser-local persistence for hosted use, configurable parent link/theme, and mobile layout improvements. Both the original localhost app and static-hosted build are supported.

## GitHub Pages / existing website

Read **GITHUB-PAGES.md** for upload and integration instructions. This release includes ready-to-upload static files at **pages-site/quant-practice/**. Copy that subfolder into your existing site's published root/output; link to `quant-practice/`. Do not replace the parent homepage. No server is needed for this build.

To rebuild: `npm ci` then `npm run build:pages`. Set the output subdirectory and parent-site link in `site.config.json`. All app assets are relative, so repository prefixes and nested paths work without hard-coded URLs. Change colors/layout variables in `public/host-theme.css` before building, or the deployed `host-theme.css` afterward. Preview with `npm run preview:pages`.

The static build stores progress in IndexedDB on the current browser/device, scoped to the app path. It does not sync with localhost or other devices. Export progress from the old app and import on the hosted app to migrate. Browser clearing/private sessions/storage restrictions can affect saved data; keep JSON backups. No progress or private data is included in the upload-ready files.


## Run on your computer

Requires Node.js 22.13 or newer and npm. Unzip this project, open a terminal inside `quant-practice`, and run:

```sh
npm install
npm run dev
```

Then open **http://localhost:5173**. After the initial dependency installation, `npm run dev` is the only command needed. In localhost mode, the app, fonts, and persistence run locally; no account, cloud service, or internet connection is needed at runtime. The first install requires npm registry access.

Stop with Ctrl+C. To use another port, set `PORT` (for example, `PORT=5174 npm run dev` on macOS/Linux or `$env:PORT=5174; npm run dev` in PowerShell).

## Upgrade from an earlier release

Stop the running app with Ctrl+C. Copy the contents of this release into your existing `quant-practice` folder, replacing the source files while keeping your existing `data/` folder. This release does not include or overwrite progress data. Restart with `npm run dev`. No new dependencies are required.

Alternatively, export progress from the old app, extract this release into a new folder, run `npm install` and `npm run dev`, then import the exported JSON. Old sessions and presets remain supported.

## Test this milestone

1. Open Arithmetic sprint. Each operation now has its own section: first/second factors sit together, and dividend/divisor sit together. Easy/Medium multiplication uses 2–12 × 2–100; division uses a dividend of 2–100 and divisor of 2–12.
2. Enable/disable operations and change their ranges. Save and reload a named preset.
3. Start a sprint. The answer field receives focus. Correct answers advance immediately; Enter checks a wrong answer; Escape skips it.
4. Wait for the timer. Check the score, accuracy, and average response time, then open History.
5. Restart the server and confirm that your sessions and presets remain.
6. Export JSON from History or Overview. Import it again; existing IDs are deduplicated. Imports merge with existing data, never replace it.
7. Open Trading mental math. Select a topic mix, difficulty, timer, number sizes and rounding/tolerance settings. Save and reload a preset.
8. Press Enter to submit an answer. Read the explanation, then Enter again for the next question. Escape skips an unanswered question. Confirm negative percentage changes, fractions rounded as instructed, and estimates within the displayed tolerance.
9. Complete a mental-math sprint and verify that its results appear separately in History and in the overall skill comparison.
10. Open Market making · Dice. Start on Easy. Enter a bid, press Enter to move to ask, and Enter again to submit. Quotes must respect the maximum spread and payout range.
11. Check that buying adds inventory and spends cash; selling reduces inventory and earns cash. Move quotes lower when long and higher when short. Watch the running P&L and inventory charge.
12. Try a short custom session (3 rounds, 5 seconds per quote) and let a quote time out. It should charge 1.00 plus the normal inventory penalty, then pause on review.
13. Complete a dice session. Check final dice/event settlement, gross P&L, penalties, net P&L and the round ledger. In History, verify net P&L/fill-rate charts and saved presets. Export/import all three game types.
14. Open Card market taking on Easy. Use the EV hint to buy below fair value, sell above it, or pass. B/S/P shortcuts match the buttons; Enter advances from review.
15. Check that each review reveals the hidden cards and explains EV after removing the visible cards from the deck. The displayed bid is where you sell; the ask is where you buy.
16. Try Medium or turn the EV hint off. Set a short custom session and let one round time out. It should count as an incorrect pass with zero captured edge.
17. Complete a Card session. Confirm captured-edge score, separate realized P&L, decision accuracy and edge left behind. Verify card history and saved presets, then export/import all four game types.
18. Open Guide in the header. It should open the current game’s guide, let you switch among all ten games in Practice order, and provide four subsections plus annotated walkthrough steps.
19. Start Fermi Estimation on Easy. Enter a positive low/high range using plain numbers, commas, scientific notation or k/m/b/t suffixes. Enter advances lower → upper → submit.
20. Check review feedback: target, hit/miss, interval diagram, precision/speed breakdown and calculation/source. Try a narrow successful interval, a wide interval and a miss. Equal/reversed bounds should be rejected without scoring.
21. Let a Fermi question time out; it should earn zero and count as a miss. Complete the session and check points per question, hit rate, average interval width, history and presets. Export/import progress containing all five games.
22. Open Event Contracts on Easy. Enter an independent probability forecast, then bid and ask using Enter to move between fields. Quotes must stay in 0–100 and within the maximum spread.
23. Review the outcome, true probability, trader fills, realized P&L and Brier adjustment. The informed trader knows the probability, not the outcome. All units settle before the next event.
24. Try a three-event custom session with a five-second deadline. A timeout makes no trades, charges 1.00 and records a 50% forecast. Review screens pause the timer.
25. Complete a session and check combined score, separate net P&L, Brier history and the calibration table. Save/reload an event preset; export/import progress containing all six games.
26. Open Combined Trading on Easy. Enter a bid and ask around the displayed fair value. Review the fill with the timer paused; the separate book should remain hidden until you open the taking stage.
27. Press B/S/P to buy, sell or pass against the separate book. Buy at the ask, sell at the bid. Check passive and active P&L against the same revealed payout.
28. Try a three-round custom session with five seconds per stage and zero settlement shock. Let each stage time out once; each missed stage costs 1.00, and you still get the taking stage after a quote timeout.
29. Complete the session and check combined/passive/active P&L charts, optimal taking decisions, presets and the round ledger. Export/import all seven game types without duplication.
30. Open EV & probability. Choose topics, complexity, maximum payout and probability precision; save and reload a preset.
31. Try equivalent probability inputs: 0.25, 1/4 and 25%. For EV, enter net profit after the fee; for +EV decisions enter yes/no (y/n). Break-even is no. Enter submits, then Enter advances the explanation; Escape skips.
32. Try a 10-second custom session. The timer continues during review. Check score, accuracy, response time, History and Overview. Export/import all eight game types.
33. Open Number Series on Easy. Confirm the family hint is shown. Enter the next integer, including negative values when needed. Enter checks the answer; Enter again advances; Escape skips.
34. Try Medium/Hard with hints off. Check that the family name appears only during review, then inspect the rule and next-term calculation. Select individual families in Custom and try 6–8 visible terms.
35. Save/reload a Number Series preset, finish a short sprint, and check score/minute, accuracy, response time and history. Export/import all nine game types.
36. Open Make 24. Enter an expression using each card once. Check that duplicates must be used the displayed number of times, parentheses work, and any correct solution is accepted.
37. Try integer-only Easy and fractional Medium/Hard. In Custom, try each target (12, 24, 36, 48). Every generated hand should have a valid solution. Invalid syntax/card usage stays editable; a valid wrong result or Escape reveals a solution and counts as an error.
38. Finish a short session, check history and presets, and export/import progress with all ten games. Existing sessions should remain deduplicated.
39. Try light mode and a narrow/mobile window; sequences and cards should wrap without horizontal page overflow.

## Scoring and behavior

- Drill score: number of correct answers in a completed sprint. Dice score: final realized net P&L, after penalties. Card score: captured expected edge, independent of realized draws. Fermi score: summed interval points; dashboard/history compare average points per question out of 100.
- Drill bests/trends use correct answers per minute. Dice bests/trends use net realized P&L; Card bests/trends use captured expected edge, both without time normalization. Fermi averages points per question rather than per minute, since its score already includes speed. Compare the same difficulty, settings and round count; different custom settings are not directly comparable.
- Arithmetic accuracy: correct / (correct + incorrect Enter checks + skips). Partial typing does not count as an error. Rechecking the same unchanged wrong answer counts once.
- Mental-math accuracy: correct / (correct + incorrect submissions + skips). Each question can be submitted once, followed by an explanation. Invalid/non-numeric input is not scored. Review time counts toward the session timer, but not the next problem’s response time.
- Drill average response: time from each question appearing to its correct answer; skipped questions are excluded. Time spent on incorrect checks before a correct answer is included. Dice average response measures submitted quotes only; Card average response measures submitted decisions (including deliberate passes). Timed-out rounds and review time are excluded.
- Subtraction is nonnegative. Multiplication uses independent first-factor and second-factor ranges. New division settings bound the actual divisor and dividend, selecting only combinations with whole-number answers. Impossible division ranges are rejected.
- Old arithmetic presets remain compatible: division retains its original divisor/answer ranges and is labeled "Answer (legacy)" in setup. "Use dividend range" switches it to the new 2–100 dividend setting. Existing stored sessions are not rewritten.
- Mental math covers percent-of-number, signed percentage change, fractions to decimals, simple interest earned, and compounded final balances. Fractions use the configured decimal places; other exact numerical answers use two decimal places. Compounding accepts the configured relative percentage error around the true final balance. Each prompt states its rule, and percentages accept a trailing `%`.
- Mental math uses one question at a time. Difficulty changes amount size, percentage/rate size, fraction denominator, time horizon, precision, tolerance and duration.
- Active timers use elapsed time and keep running in background tabs. Dice, Card, Fermi, Event and Combined Trading review screens pause the round timer. Reloading or leaving gameplay abandons an unfinished session; only completed sessions are saved.
- Streaks use your browser's local calendar days and include a streak ending yesterday.
- Improvement compares score/minute (drills) net P&L (Dice), captured edge (Cards), or average points per question (Fermi) for the latest 10 sessions with up to 10 preceding sessions of the selected game/difficulty. It appears after 11 sessions.
- Overview identifies the highest average error rate among practiced drills and the lowest average net P&L among practiced P&L games separately. Cards have a separate expected-edge and optimal-decision summary; Fermi has a separate average-score and interval-hit summary. It does not mix fill rates with drill accuracy. These are practice heuristics, not standardized aptitude scores.

## Dice game mechanics

One session trades one contract throughout. Two or three independent fair six-sided dice are sampled at the start. Dice become public as rounds progress; at least one stays hidden until settlement. Every unit pays the same final sum, plus a uniformly sampled integer modifier in the configured ±range, minus an optional downside event loss.

- Public fair value = revealed dice + 3.5 × unrevealed dice − event probability × event loss. The hidden modifier has a public mean of zero.
- The counterparty's true expected value = public fair value + the actual modifier. It knows that modifier, but does not know unrevealed dice or whether the downside event occurs.
- A counterparty buy fills your ask: you sell one unit and receive cash. A counterparty sell fills your bid: you buy one unit and pay cash.
- After every quoting round, including no-fill rounds, the charge is `inventoryPenalty × inventory²`. A missed quote adds 1.00. Position limits block fills that would take you beyond ±limit; fills reducing exposure remain possible.
- Running net P&L = cash + inventory × public fair value − accumulated penalties. This is a mark, not realized profit, and it omits private information.
- Final gross P&L = cash + inventory × final payout. Net P&L/score = gross P&L − accumulated penalties. All units settle to zero inventory. The result screen includes every round's quote, fill, position and penalty.
- Session duration includes review time; quote response times exclude it. Fill rate counts filled rounds divided by all rounds; it is an activity measure, not accuracy. Gross/net P&L, penalties, fill count, round count and peak position persist with the session; the detailed round ledger is displayed for the current session only.

### Reusable counterparty API

`shared/counterparty.mjs` is game-independent. `decideTrade` accepts `{bid, ask, trueValue, aggressiveness, noise, noiseTradeProbability, edgeScale, minEdge, quantity}` plus an optional deterministic random function. Noise is uniform ±price units. The noise-trade branch buys or sells randomly; otherwise it trades only beyond the quote with probability `aggressiveness × (1 − exp(−(edge − minEdge) / edgeScale))`. Action is from the counterparty perspective. `makerFill` converts it into the maker's inventory/cash changes.

The dice adapter owns payout, inventory limits, charges and settlement. The Card adapter also uses this engine for dealer demand and its `takeQuote` helper for firm-book execution. Event Contracts configures the same engine for noise and informed traders. Combined Trading uses the same decision engine for passive fills and the shared firm-book helper for active execution. All simulation code runs locally.

## Card market-taking mechanics

Each round starts from a fresh 52-card deck with four suits and ranks A=1 through K=13. Cards are sampled without replacement. A configurable number are visible; the rest of the hand stay hidden until you decide. The contract pays the sum of all cards in the hand. One-unit trades settle immediately, with no position carried to the next deck.

With visible sum `S`, visible count `V`, and hidden count `H`:

```text
Fair value = S + H × (364 − S) / (52 − V)
Buy edge   = fair value − ask
Sell edge  = bid − fair value
Pass edge  = 0
```

- Buy at the displayed ask, sell at the displayed bid, or pass. Quotes are firm, so a selected trade always executes.
- The shared `decideTrade` engine models the dealer's noisy demand around a fair reference book. Buy demand raises its posted market, sell demand lowers it, and a pass leaves a fair two-sided quote. This creates positive-edge buy/sell opportunities as well as rounds where passing is best. The shared `takeQuote` helper executes the user’s choice using the same fill accounting as Dice.
- Session score is the sum of chosen expected edges. Negative-edge trades subtract from the score. Passing earns zero, including when a positive-edge opportunity is missed.
- Best available edge is the sum of `max(buy edge, sell edge, 0)`. Edge left behind is best available edge minus captured edge; it includes both missed opportunities and losses from bad trades.
- Decision accuracy is the proportion choosing a maximum-edge action, allowing ties at zero edge. A timeout is always counted incorrect and executes no trade. There is no additional timeout score penalty.
- Realized P&L uses the actual revealed payout: payout minus ask for buys, bid minus payout for sells. It is displayed separately and never determines Card score or personal bests.
- Easy enables the fair-value hint. Medium/Hard hide it, increase hand size and shorten the timer; spreads and mispricing become smaller. Every setting can be saved as a custom preset.
- B buys, S sells, P passes; Enter advances from the review screen. The quote timer continues in background tabs but pauses on review screens. A fresh round starts when you advance.
- Results save when you choose See results from the final review. Exiting to the dashboard before then discards the session. Session duration includes earlier review time but not the final review. Score, realized P&L, optimal-decision rate, available/missed edge, fill count and response times persist. Detailed hands and the round ledger remain available on the current results screen only.

## Fermi Estimation mechanics

Enter a positive lower bound and a strictly larger upper bound in the question’s displayed units. Supported inputs include `2500000`, `2,500,000`, `2.5m`, and `2.5e6`; suffixes k/m/b/t mean powers of 1,000. Bounds are limited to 1e18. Equal, reversed, zero, negative and malformed bounds are rejected without scoring; the question timer keeps running.

The question bank contains 22 fixed benchmarks and 22 parameterized scenario templates. Easy/Medium/Hard control eligible reference levels, scenario scale, per-question time and scoring weights. Custom presets can select mixed questions, benchmarks only or scenarios only. Templates are sampled without repetition until the selected pool is exhausted; scenario values change between sessions.

- Benchmarks include explicit unit/count calculations and rounded scientific reference values. Scientific facts are bundled locally; reference links are displayed only on review. A narrow interval is checked against the stored rounded benchmark, not every possible measurement of the physical quantity.
- Scenarios state their modeled assumptions, and their target is calculated from those assumptions. They are not empirical claims about real towns or companies.
- A hit includes either boundary: `low ≤ target ≤ high`. Misses and timeouts score zero.
- For hits: `relativeWidth = (high − low) / target`; `precision = 1 / (1 + relativeWidth)^precisionWeight`; `speed = 1 − speedWeight × min(1, responseTime / allowedTime)`; `points = 100 × precision × speed`, rounded to two decimals.
- Tighter successful intervals score higher at the same speed, and faster estimates score higher at the same width. Scores remain between 0 and 100. This is an estimation game score, not a formal statistical confidence-level guarantee.
- Example using Medium settings: target 1,000, bounds 800–1,200, 22.5 seconds of 45 used. Relative width = 0.4, precision = 1/1.4, speed = 0.875, score = 62.50.
- Review screens pause the timer. A timeout stores no interval and earns zero. Average response time and average relative width include all submitted intervals, including misses, but exclude timeouts.
- Session totals, average points per question, interval hit rate, average relative width and response time persist locally. Full prompts and interval diagrams remain available in the current session’s reviews/results; they are not included in the progress summary file.
- History charts show average points per question and interval hit rate. Width in the history table means average `(high − low) / target`, displayed as a percentage. Compare similar question sets, levels and scoring weights.

### Reference sources

Scientific benchmark values were verified on 2026-09-25 against [NASA Earth facts](https://science.nasa.gov/earth/facts/), [NASA Moon facts](https://science.nasa.gov/moon/facts/), and [NASA Sun facts](https://science.nasa.gov/sun/facts/). The app stores the benchmark, attribution and explanation locally and makes no runtime requests to these sites. Opening an optional source link requires an internet connection.

## Event Contracts mechanics

Each round is a fresh synthetic binary event paying 100 for YES and 0 for NO. Its hidden probability is sampled uniformly from integer percentages 5–95. The displayed historical observations and the next outcome are independent Bernoulli samples at that probability. They are simulated evidence, not real-world forecasts.

- Enter your probability forecast in percent separately from your bid/ask. Your forecast is scored against the realized outcome, so it need not equal your quote midpoint.
- Each noise trader randomly buys or sells with the configured activity probability, otherwise passes. Exactly one informed trader knows the underlying probability but not the outcome. It trades more readily as positive edge increases, controlled by aggressiveness. All traders use the generic counterparty engine; order is randomized.
- A trader buying at your ask leaves you short one unit and credits cash. A trader selling at your bid leaves you long one unit and debits cash. Each trader can fill one unit; all positions settle after that event, with no inventory carried to the next round.
- Gross P&L = cash + inventory × payout. Net P&L subtracts timeout charges. Forecast Brier = `(forecast / 100 − outcome)²`, where outcome is 0 or 1. Session Brier averages every event; lower is better. A constant 50% forecast scores 0.25.
- Combined score = `net P&L + calibrationWeight × rounds × (0.25 − mean Brier)`. Default weight is 20. Results show both components separately; dashboard bests and trends use the combined score. Compare matching settings and round counts.
- Example: forecast 60%, buy at 55, outcome YES. P&L is +45, Brier is 0.16, adjustment is `20 × (0.25 − 0.16) = +1.80`, combined score +46.80.
- Timeouts execute no trades, charge 1.00, and contribute a default 50% forecast (Brier 0.25, zero adjustment). They cannot disappear from the Brier denominator. Fill rate counts fills / trader visits on submitted rounds; it is not decision accuracy.
- Review pauses the timer. Average response time includes submitted quotes only. Completed sessions save forecast/outcome pairs for calibration across sessions, alongside P&L, Brier, combined score and settings. Detailed trader fills remain available in the current session only.
- History shows combined score, net P&L and Brier over time. The five-bin calibration table compares average forecasts with observed YES rates using the selected difficulty filter. Small samples are noisy. Brier measures overall probability accuracy, not calibration alone. Overview also shows an event-weighted Brier across sessions.

## Combined Trading mechanics

Each round trades a new contract in two stages. The displayed fair value is sampled between 20 and the configured maximum, rounded to cents. Payout equals fair value plus an independent uniformly sampled integer shock in the configured ±range. Neither trader knows the settlement draw. Zero settlement shock makes payout equal fair value.

1. **Make:** post a two-way quote within the maximum spread. The generic counterparty engine buys, sells or passes using fair value, aggressiveness, valuation noise and random-trade probability. A fill trades one unit. Review pauses the timer and shows cash, position and expected edge before settlement.
2. **Take:** open a separate firm book. Its midpoint is independently skewed by a uniform amount in the configured ±range around fair value, with the configured spread (rounded to cents). This book does not depend on your quote or passive fill. B buys one unit at its ask, S sells at its bid, P passes.
3. **Settle:** both trades settle at the same payout. A new round resets inventory. There is no cross-round position charge; at most two units can be open within a round.

- Passive gross P&L = passive cash + passive inventory × payout; active gross P&L uses the same formula. Each leg deducts 1.00 for its own timeout. Combined score = passive net P&L + active net P&L.
- Example: quote 99 / 101 around fair value 100, buy one at 99, then sell at the separate book bid of 102. The combined position is zero and profit is +3 at any payout, before charges.
- Taking decision accuracy measures choosing the highest expected edge: `fair value − ask` for buy, `bid − fair value` for sell, zero for pass. Ties at zero are accepted. Timeouts are incorrect. This is an expected-edge diagnostic; realized P&L still determines the score.
- A quote timeout executes no passive trade but still allows the taking stage. A taking timeout executes no active trade, then settles any passive position. Each stage has a fresh timer; both review screens pause it. Timers keep running in background tabs.
- Average response time covers submitted quotes and taking decisions, including deliberate passes, but excludes timeouts and reviews. Session duration includes earlier reviews but excludes the final review.
- History saves combined/passive/active net P&L, gross P&L, timeout counts, fills by leg, taking accuracy and response times. Fill rate is fills divided by twice the number of rounds; this is activity, not accuracy. The full round ledger is available on the current results screen only.
- Easy/Medium/Hard change time pressure, number size, quoting spread, counterparty behavior, book spread/skew and payout risk. Save any configuration as a named preset. Compare matching settings and round counts.

## EV/probability drills

A timed stream covers four selectable topics: expected net profit, dice probabilities, card probabilities, and strictly positive-EV decisions. Correct answers earn one point. Wrong submissions and skips count as errors; malformed input is not scored. Bests and trends use correct answers per minute, with accuracy tracked separately.

- **Complexity 1:** one-die thresholds, single-card suit/rank draws, and two-outcome bets using 25% probability increments.
- **Complexity 2:** exact sums of two independent dice, two-card draws without replacement, and two-outcome bets using 10% increments.
- **Complexity 3:** dice sums conditional on an even first die, at-least-one-ace complements over multiple draws, and three-outcome lotteries.
- All dice are fair six-sided dice; cards use a standard shuffled 52-card deck. Prompts explicitly state replacement and conditioning assumptions.
- EV is the probability-weighted sum of total receipts minus the entry fee once. Negative net-profit answers are allowed. A +EV decision is yes only when EV is strictly positive; zero is no.
- Probability inputs support decimals, fractions with positive denominators, and percentages. They must represent a value from 0 to 1. Answers within half a unit of the displayed decimal precision are accepted, so rounded answers and exact fractions both work. EV uses half-cent tolerance. Decision inputs accept yes/y/no/n, case-insensitively.
- Each answer shows the solution and reasoning. Enter checks, then advances after review; Escape skips from the answer field. The session clock includes reviews and continues in background tabs. The unfinished question at the deadline is unscored.
- Average response time includes correct answers only and excludes the previous review. Completed sessions save timestamp, settings, difficulty, score, accuracy and average response time. Individual question text remains transient.
- Easy/Medium/Hard change complexity, payout range, probability precision and duration. Custom presets can isolate a topic or mix all four. Compare similar settings when interpreting score trends.

## Number Series mechanics

Complete a sequence with the next integer. The generator supports ten families:

- Constant difference: add or subtract the same step.
- Constant ratio: multiply by 2 or 3.
- Growing differences: increase each successive gap by a constant amount.
- Alternating operations: add a step, then subtract one more than that step, repeatedly.
- Interleaved sequences: odd and even positions each follow their own arithmetic progression.
- Previous-two recurrence: each term is the sum of the preceding two.
- Shifted squares: `coefficient × n² + offset`, with n starting at 1.
- Multiply then add: apply a constant multiplier, then add a constant.
- Shifted cubes: `coefficient × n³ + offset`.
- Scaled triangular numbers: `offset + coefficient × n(n+1)/2`.

Easy uses constant differences, ratios and shifted squares with family hints. Medium adds growing differences and alternating operations and hides hints. Hard includes all families, larger seed/step ranges and a shorter session. Custom settings select any family mix, 6–8 visible terms, number ranges, duration and hint visibility. The seed/offset maximum does not bound later terms. Ratio is always 2 or 3; alternating/interleaved second steps are one greater than the sampled base step.

Correct answers earn one point. Incorrect submissions and skips count as errors; invalid input is not scored. Answers must be plain integers, with an optional minus/plus sign. The review gives the intended rule and calculation. Finite sequences can fit multiple rules; this drill grades against its generated pattern, not every mathematically possible continuation.

Enter submits, then advances after review; Escape skips an unanswered problem from the answer field. The timer includes reviews and continues in background tabs. An unfinished sequence at the deadline is unscored. Average response time covers correct answers only. History and personal bests use score/minute and accuracy; compare matching families, ranges, visible-term counts and hint settings. Sessions and named presets persist locally; individual sequences are transient.

## Make 24 mechanics

Combine four displayed card values using addition, subtraction, multiplication, division and parentheses to reach the target. Every hand is checked by a solver before display. Sampling tries at most 60 hands, then uses a known solvable fallback, so unusual custom settings never cause an endless search. Values are drawn from 1 through the configured maximum; repeated values are allowed. Decorative suits have no effect. Ace=1, jack=11, queen=12, king=13; enter numeric values.

- Use each card exactly once. The checker compares the multiset of numeric operands, so a repeated value requires the matching number of occurrences.
- Type `+ - * /` and parentheses; `× ÷ −` are accepted too. Standard operator precedence applies. No concatenation, powers, factorials, implicit multiplication, extra constants or unary signs. Negative intermediate results obtained through subtraction are allowed.
- A small arithmetic parser uses exact reduced fractions; it never executes input as JavaScript. For example, `8 / (3 - 8 / 3)` with cards 3, 3, 8, 8 equals exactly 24.
- Easy uses values up to 6 and requires all intermediate results to be integers. Medium uses values up to 9 and allows fractions. Hard uses values up to 13, allows fractions and shortens the session. Custom targets are 12, 24, 36 and 48; all settings can be saved as presets.
- Any valid expression reaching the target earns one point. A valid expression with the wrong value or a skip counts as an error and reveals a solution. Syntax, card-usage, division-by-zero and integer-only violations remain editable without a scoring penalty; time continues.
- Reviews show the submitted successful expression or one generated solution, followed by its evaluation steps. Enter submits and advances; Escape skips from the input field. Review time is included in the session clock, including background tabs. An unfinished hand at the deadline is unscored.
- Accuracy is correct / (correct + wrong expressions + skips). Average response time covers correct solutions only; time correcting invalid expressions is included. Dashboard bests use correct solutions per minute. Compare matching targets, ranges and integer-only rules.
- Completed session metrics and presets persist; expressions and hands remain transient.

## Variety and repetition

EV/probability now has 16 templates across its four topics. Added questions cover break-even ticket prices, signed profits/losses, repeated-play totals, independent compound bets, dice doubles/exact counts/at-least-one events, card suit matching, exactly-one-rank draws and conditional cards. Read whether the requested amount is profit or an entry price.

Fermi now has 22 benchmarks and 22 parameterized scenarios. New contexts include hospitals, elevators, rice demand, streaming bandwidth, commuting time, solar output, rainwater, storage, laundry, charging, email and paint. All added reference targets are mathematical calculations; added modeled scenarios explicitly state their assumptions. Templates still do not repeat within a session until the pool is exhausted. The following session prefers templates absent from the preceding session at the same level/question-set setting.

Series has ten pattern families; Events has sixteen synthetic event contexts. Arithmetic, mental math, EV, Series and Make 24 remember the most recent 12 prompt signatures per settings profile and retry recent duplicates. Make 24 uses the sorted card values and target as its signature, so reordering the same hand is not treated as new. Retry limits keep small custom pools playable, so repetition remains possible when the eligible pool is small. This memory lasts across sessions/game switches within the same page, and resets on reload. It does not write question history to your progress file.

Cards, Dice and Combined Trading already sample large numeric/card spaces; their scoring and generation remain unchanged. Make 24’s solution button now appears on its own row below the evaluation steps.

## Visual Guide

Open **Guide** in the header. From a game setup or results page, it selects that game; from the dashboard it starts with Market Basics. The game navigation follows Practice card order.

Each guide has four linkable sections:

1. **See the screen:** an interface illustration using the app’s typography, colors, cards and quote styles. Select Read, Act or Review to highlight the corresponding numbered region and reveal a worked result. Next/Back buttons also advance the walkthrough. These are labeled examples, not live games or captured screenshots; no timer runs and no session is saved.
2. **Build your approach:** numbered strategy cards and expandable mistake checkpoints.
3. **Understand the score:** scoring rules, a worked result, timer behavior and persistence details.
4. **Set up practice:** difficulty guidance and a path into the actual game’s setup screen.

Long-form controls remain under **Full rules and controls**. The Guide uses normal page navigation instead of a modal, supports keyboard-operable links/buttons, and adapts its sidebar and illustrations to smaller screens. The Practice this game link opens setup; it does not start or save a session.

To check this update: open each game’s Guide, select all three walkthrough steps, try all four subsections, and use browser Back/Forward. Confirm highlights follow the selection and the demo changes no progress data. Check dark/light and narrow layouts. During active gameplay, Exit to dashboard remains available; the Guide does not interrupt a running timer.

## Market Basics for beginners

The Guide now starts with a foundations course at `#/guide/basics/start`. It assumes no market vocabulary and covers:

1. Contracts, prices, payouts and settlement.
2. Bid, ask, spread, maker/taker roles, books and fills.
3. Cash, signed inventory, long/short/flat positions, marked/realized and gross/net P&L.
4. Fair value, probability-weighted outcomes and expected edge versus realized luck.
5. Adverse selection, informed/noise traders, position risk and quote skew.
6. How these concepts map to Dice, Cards, Events and Combined Trading, including Brier/calibration.
7. A quick glossary.

Interactive quote examples switch between your quote and another participant’s quote, then show cash and inventory for a fill. The P&L sandbox varies side, units, valuation and charges; its line chart and ledger update together, with a settlement view. The probability example shows how expected value changes without forcing the realized outcome to equal that average. All examples are hypothetical, have no live clock, and save no session data. The market-game guides link to the relevant fundamentals chapters.

Check this update by opening Guide from the dashboard, switching bid/ask perspectives, buying/selling one unit, moving the payout slider for both long and short positions, and selecting settlement. Confirm that higher payout helps longs and hurts shorts, charges reduce net P&L, and the glossary/game links navigate correctly. Check dark/light and narrow layouts.

## Leaving a game

Use **Exit to dashboard** during any active game or review to abandon that session immediately and choose another mode. No confirmation dialog is needed; the control explicitly states that exiting discards progress. The abandoned session adds no score, history row or streak credit, and existing sessions/presets remain untouched. Timers and game keyboard listeners are removed when leaving.

Cards, Fermi, Event Contracts and Combined Trading now save only after **See results** on their final review, so that review is still discardable. Timed sprints save when their timer ends; Dice saves at final settlement. Once on a completed results page, returning to Practice preserves that completed result.

To check this update: note your session count, start each mode, answer or quote at least once, and exit while active or reviewing. Confirm the count is unchanged and reopening starts a fresh session. Also test Exit on the final review of Cards/Fermi/Events/Trading, then complete another session using See results and confirm that one saves. Check the tutorial order against Practice and scroll through each expanded guide in light/dark and narrow layouts.

## Local data and backup

In localhost mode, progress is stored in `data/progress.json`, created after your first save. Static Pages builds use browser IndexedDB instead. This folder is excluded from source control and release bundles. Theme preference stays in browser local storage. Atomic file replacement and serialized updates protect concurrent saves. Imports are versioned and validated, limited to 10 MB, and merged by ID. Keep regular JSON exports for backup.

Use `DATA_FILE` to override the data path for isolated testing. The server binds to loopback only; it is intended for one user on localhost, with no authentication. Run one server per data file.

If saving fails, the result screen retains the session and offers Retry save. Retry before navigating away.

## Project structure

- `src/App.tsx`: dashboard, hash routing, history, overview, backup UI and theme.
- `src/games/Arithmetic.tsx`: arithmetic setup, presets, timed gameplay and results.
- `src/games/MentalMath.tsx`: mental-math setup, timed answers, explanations and results.
- `shared/mental.mjs`: mental-math generation, answer checking, defaults and validation.
- `src/components/ArithmeticRanges.tsx`: grouped operation/range settings.
- `src/games/DiceGame.tsx`: dice setup, quote/review flow and settlement screen.
- `shared/counterparty.mjs`: generic trade decision and maker-fill accounting.
- `shared/dice.mjs`: dice defaults, public information, round resolution and settlement.
- `src/games/CardGame.tsx`: card setup, buy/sell/pass play, reviews and results.
- `shared/cards.mjs`: deck sampling, conditional EV, dealer quotes and edge scoring.
- `src/games/FermiGame.tsx`: interval input, scoring review and results.
- `shared/fermi.mjs`: bundled question bank, scenario generation, parsing and scoring.
- `src/games/EventGame.tsx`: event forecasts, quoting, reviews and results.
- `shared/events.mjs`: synthetic evidence, trader profiles, settlement and calibration.
- `src/games/TradingGame.tsx`: passive/active stage flow, reviews, presets and combined results.
- `shared/trading.mjs`: contract generation, shared-engine adapters and joint settlement.
- `src/games/ProbabilityGame.tsx`: timed EV/probability input, reviews, presets and results.
- `shared/probability.mjs`: problem generation, probability calculations, parsing and grading.
- `src/games/SeriesGame.tsx`: series input, hints, explanations, presets and results.
- `shared/series.mjs`: integer sequence generation, configuration and grading.
- `src/games/TwentyFourGame.tsx`: card expression input, solution review, presets and results.
- `shared/twenty-four.mjs`: solvable hand generation, exact-fraction solver and arithmetic parser.
- `src/components/MarketBasics.tsx`: beginner concepts, interactive diagrams, ledger and glossary.
- `shared/market-basics.mjs`: tested teaching-example accounting.
- `src/components/GuidePage.tsx`: dedicated Guide routing, sections and interactive annotated interface illustrations.
- `src/components/guideExamples.ts`: worked UI examples and callout descriptions for all games.
- `src/components/tutorials.ts`: game rules, controls, scoring and timing content.
- `src/components/tutorialDetails.ts`: per-game strategies, settings guidance and common mistakes.
- `src/lib/`: shared frontend types, API client and transactional IndexedDB adapter.
- `shared/browser-progress.mjs`: browser data validation, deduplication and merge logic.
- `site.config.json`: static output subdirectory and parent-site link.
- `scripts/package-pages.mjs`: creates the upload-ready static subfolder.
- `public/host-theme.css`: optional host-site style overrides.
- `shared/variety.mjs`: bounded recent-prompt avoidance for drill generators.
- `shared/model.mjs`: game registry, arithmetic generation, defaults, validation and streak calculation.
- `server/index.mjs`: Node HTTP server, Vite development middleware, local API and production static serving.
- `server/store.mjs`: serialized JSON persistence and atomic writes.
- `tests/`: arithmetic invariants, config validation, streaks, persistence and API integration.

The dependency set is React + React DOM at runtime, and TypeScript + Vite for development/building. The backend uses Node built-ins.

## Validation and production mode

```sh
npm test
npm run build
npm start
```

The build type-checks TypeScript and emits static assets in `dist/`. `npm start` serves those assets alongside the same local API. Tests use temporary data, never your real progress. Automated browser testing was unavailable in the build environment; use the checklist above to verify gameplay and responsive styling on your machine.

## Agreed build order

- [x] Scaffold, local persistence, difficulty/preset infrastructure, progress pages
- [x] Zetamac-style arithmetic — user tested; independent ranges added
- [x] Mental math for trading — user tested
- [x] Generic simulated counterparty engine (before any dependent game)
- [x] Market Making Dice Game — user tested
- [x] Card Game — user tested
- [x] Fermi Estimation — user tested
- [x] Event Contracts Game — user tested
- [x] Combined Trading Game — user tested
- [x] EV/probability drills — user tested
- [x] Number series — user tested
- [x] Make 24 — ready for user testing

All ten requested game modes are implemented. Make 24 is the final milestone awaiting user testing. Optional sound feedback and scheduled reminders are not included; streaks and per-difficulty personal bests are available.
