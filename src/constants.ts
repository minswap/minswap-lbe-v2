export const LBE_INIT_FACTORY_HEAD = "00";
export const LBE_INIT_FACTORY_TAIL =
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00";
export const LBE_MAX_PURR_ASSET = 9_223_372_036_854_775_807n;
export const LP_COLATERAL = 10n;
export const MINSWAP_V2_DEFAULT_POOL_ADA = 4_500_000n;
export const MINSWAP_V2_MAX_LIQUIDITY = 9_223_372_036_854_775_807n;
export const MINSWAP_V2_POOL_AUTH_AN = "4d5350";
export const MINSWAP_V2_FACTORY_AUTH_AN = "4d5346";
export const FACTORY_AUTH_AN = "666163746f7279";
export const TREASURY_AUTH_AN = "7472656173757279";
export const SELLER_AUTH_AN = "73656c6c6572";
export const MANAGER_AUTH_AN = "4d616e61676572";
export const ORDER_AUTH_AN = "6f72646572";
export const ORDER_COMMISSION = 250_000n;
export const COLLECT_SELLER_COMMISSION = 250_000n;
export const SELLER_COMMISSION = 1_500_000n;
export const CREATE_POOL_COMMISSION = 10_000_000n;
export const DUMMY_REDEEMER = "d87980"; // 121([])
export const TREASURY_MIN_ADA = 3_000_000n;
export const MANAGER_MIN_ADA = 2_000_000n;
export const SELLER_MIN_ADA = 2_000_000n;
export const ORDER_MIN_ADA = 2_000_000n;
export const MAX_PENALTY_RATE = 25n;
export const MINIMUM_SELLER_COLLECTED = 20n;
export const MINIMUM_ORDER_COLLECTED = 30n;
export const MINIMUM_ORDER_REDEEMED = 30n;

// LBE Constraint
export const DISCOVERY_MAX_RANGE = 30 * 24 * 60 * 60 * 1000; // 30 days
export const POOL_ALLOCATION_MIN = 70n;
export const POOL_BASE_FEE_MIN = 5n;
export const POOL_BASE_FEE_MAX = 2000n;
export const PENALTY_MAX_RANGE = 2 * 24 * 60 * 60 * 1000;
export const PENALTY_MAX_PERCENT = 70;

// Batching
export const MAX_COLLECT_SELLERS = 22;
export const MAX_COLLECT_ORDERS = 50;
export const MAX_REDEEM_ORDERS = 50;
export const MAX_REFUND_ORDERS = 50;
export const MAX_SEEDS = 100;

// Protocol
export const LABEL_MESSAGE_METADATA = 674;

// Metadata Message
export const LBE_MESSAGE_INIT = "LBE-V2 | Init";
export const LBE_MESSAGE_CREATE = "LBE-V2 | Create New Event";
export const LBE_MESSAGE_CANCEL = "LBE-V2 | Cancel Event";
export const LBE_MESSAGE_UPDATE = "LBE-V2 | Update Event";
export const LBE_MESSAGE_ADD_SELLERS = "LBE-V2 | Add Sellers";
export const LBE_MESSAGE_CREATE_ORDER = "LBE-V2 | Create Order";
export const LBE_MESSAGE_UPDATE_ORDER = "LBE-V2 | Update Order";
export const LBE_MESSAGE_CANCEL_ORDER = "LBE-V2 | Cancel Order";
export const LBE_MESSAGE_COUNTING_SELLERS = "LBE-V2 | Counting Sellers";
export const LBE_MESSAGE_COLLECT_MANAGER = "LBE-V2 | Collect Manager";
export const LBE_MESSAGE_COLLECT_ORDERS = "LBE-V2 | Collect Orders";
export const LBE_MESSAGE_CREATE_AMM_POOL = "LBE-V2 | Create AMM Pool";
export const LBE_MESSAGE_REDEEM_ORDERS = "LBE-V2 | Redeem Orders";
export const LBE_MESSGAE_REFUND_ORDERS = "LBE-V2 | Refund Orders";
export const LBE_MESSAGE_CLOSE = "LBE-V2 | Close Event";
export const LBE_MESSAGE_USING_SELLER = "LBE-V2 | Using Seller";
