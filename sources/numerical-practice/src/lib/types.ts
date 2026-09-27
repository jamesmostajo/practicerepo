export type Difficulty='Easy'|'Medium'|'Hard'|'Custom';
export type Operation='add'|'subtract'|'multiply'|'divide';
export interface Config {duration:number;operations:Partial<Record<Operation,[number,number]>>;secondRanges?:Partial<Record<'multiply'|'divide',[number,number]>>;divisionRangeMode?:'dividend'|'quotient'}
export interface MentalConfig {duration:number;topics:string[];maxAmount:number;maxRate:number;maxDenominator:number;maxYears:number;decimals:number;compoundTolerance:number}
export interface DiceConfig {rounds:number;diceCount:number;roundSeconds:number;maxSpread:number;aggressiveness:number;noise:number;noiseTradeProbability:number;inventoryPenalty:number;positionLimit:number;hiddenModifier:number;eventProbability:number;eventLoss:number}
export interface CardConfig {rounds:number;roundSeconds:number;visibleCards:number;hiddenCards:number;spread:number;maxEdge:number;quoteNoise:number;aggressiveness:number;noiseTradeProbability:number;showFairValue:boolean}
export interface PlayingCard {rank:number;suit:string}
export interface CardRound {visible:PlayingCard[];hidden:PlayingCard[];fairValue:number;payout:number;bid:number;ask:number}
export interface CardOutcome {action:'buy'|'sell'|'pass';price:number|null;edge:number;pnl:number;bestEdge:number;bestAction:string;missedEdge:number;correct:boolean;timedOut:boolean}
export interface CardRecord extends CardOutcome {round:CardRound;responseMs:number}
export interface FermiConfig {rounds:number;roundSeconds:number;questionLevel:number;questionSet:'mixed'|'benchmarks'|'scenarios';precisionWeight:number;speedWeight:number}
export interface FermiQuestion {id:string;kind:string;prompt:string;unit:string;target:number;explanation:string;assumptions:string;sourceLabel:string;sourceUrl:string}
export interface FermiOutcome {hit:boolean;score:number;precision:number;speedFactor:number;relativeWidth:number|null;timedOut:boolean}
export interface FermiRecord extends FermiOutcome {question:FermiQuestion;low:number|null;high:number|null;responseMs:number}
export interface EventConfig {rounds:number;roundSeconds:number;evidenceSamples:number;maxSpread:number;noiseTraders:number;noiseActivity:number;informedAggressiveness:number;calibrationWeight:number}
export interface EventRound {id:string;prompt:string;evidenceLabel:string;trueProbability:number;successes:number;samples:number;outcome:0|1}
export interface EventTrade {role:string;action:string;price:number|null;quantity:number;cashDelta:number;inventoryDelta:number}
export interface EventOutcome {forecast:number;bid:number|null;ask:number|null;timedOut:boolean;trades:EventTrade[];fills:number;inventory:number;cash:number;grossPnl:number;penalties:number;pnl:number;brier:number;calibrationBonus:number;score:number}
export interface EventRecord extends EventOutcome {round:EventRound;responseMs:number}
export interface Forecast {probability:number;outcome:0|1;timedOut:boolean}
export interface TradingConfig {rounds:number;quoteSeconds:number;takeSeconds:number;maxValue:number;maxSpread:number;aggressiveness:number;noise:number;noiseTradeProbability:number;bookSpread:number;bookSkew:number;settlementRisk:number}
export interface TradingRound {fairValue:number;bid:number;ask:number;payout:number}
export interface PassiveLeg {bid:number|null;ask:number|null;action:string;price:number|null;inventoryDelta:number;cashDelta:number;edge:number;timedOut:boolean}
export interface TradingOutcome {action:'buy'|'sell'|'pass';price:number|null;activeTimedOut:boolean;activeEdge:number;passivePnl:number;activePnl:number;grossPnl:number;penalties:number;pnl:number;inventory:number;correct:boolean;bestEdge:number;missedEdge:number;bestAction:string}
export interface TradingRecord extends TradingOutcome {round:TradingRound;passive:PassiveLeg;quoteMs:number;takeMs:number}
export interface ProbabilityConfig {duration:number;topics:string[];level:number;maxPayout:number;decimals:number}
export interface SeriesConfig {duration:number;topics:string[];maxStart:number;maxStep:number;terms:number;showHint:boolean}
export interface TwentyFourConfig {duration:number;target:number;maxCard:number;integerOnly:boolean}
export type GameConfig=Config|MentalConfig|DiceConfig|CardConfig|FermiConfig|EventConfig|TradingConfig|ProbabilityConfig|SeriesConfig|TwentyFourConfig;
export interface Session {id:string;timestamp:string;game:string;difficulty:Difficulty;score:number;accuracy:number;avgResponseMs:number;duration:number;correct:number;errors:number;config:GameConfig;pnl?:number;brier?:number;grossPnl?:number;penalties?:number;fills?:number;rounds?:number;maxInventory?:number;fillRate?:number;capturedEdge?:number;availableEdge?:number;missedEdge?:number;averageScore?:number;averageRelativeWidth?:number|null;answered?:number;calibrationBonus?:number;traderVisits?:number;forecasts?:Forecast[];passivePnl?:number;activePnl?:number;passiveFills?:number;activeFills?:number;quoteTimeouts?:number;activeTimeouts?:number}
export interface Preset<C=GameConfig>{id:string;game:string;name:string;config:C}
export interface Data{version:1;sessions:Session[];presets:Preset[]}

export interface DiceRecord {round:number;bid:number|null;ask:number|null;action:string;price:number|null;quantity:number;reason:string;inventory:number;cashDelta:number;inventoryCharge:number;timeoutCharge:number;responseMs:number;publicValue:number}
export interface DiceState {config:DiceConfig;dice:number[];modifier:number;eventHappened:boolean;round:number;cash:number;inventory:number;penalties:number;fills:number;submitted:number;timeouts:number;maxInventory:number;records:DiceRecord[];done:boolean}
