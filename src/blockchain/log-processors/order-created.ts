import Augur from "augur.js";
import * as Knex from "knex";
import { Address, Bytes32, FormattedEventLog, MarketsRow, OrdersRow, TokensRow, OrderState, ErrorCallback} from "./../types";
import { augurEmitter } from "./../events";
import { convertFixedPointToDecimal, convertOnChainSharesToHumanReadableShares, convertNumTicksToTickSize } from "./../utils/convert-fixed-point-to-decimal";
import { denormalizePrice } from "./../utils/denormalize-price";
import { formatOrderAmount, formatOrderPrice } from "./../utils/format-order";
import { WEI_PER_ETHER} from "./../constants";
import { QueryBuilder } from "knex";

interface OrderCreatedOnContractData {
  orderType: string;
  price: string;
  amount: string;
  sharesEscrowed: string;
  moneyEscrowed: string;
  creator: Address;
  betterOrderID: Bytes32;
  worseOrderID: Bytes32;
}

export function processOrderCreatedLog(db: Knex, augur: Augur, log: FormattedEventLog, callback: ErrorCallback): void {
  const amount: string = log.amount;
  const price: string = log.price;
  const orderType: string = log.orderType;
  const moneyEscrowed: string = log.moneyEscrowed;
  const sharesEscrowed: string = log.sharesEscrowed;
  const shareToken: Address = log.shareToken;
  db.first("marketID", "outcome").from("tokens").where({ contractAddress: shareToken }).asCallback((err: Error|null, tokensRow?: TokensRow): void => {
    if (err) return callback(err);
    if (!tokensRow) return callback(new Error("market and outcome not found"));
    const marketID = tokensRow.marketID!;
    const outcome = tokensRow.outcome!;
    db.first("minPrice", "maxPrice", "numTicks").from("markets").where({ marketID }).asCallback((err: Error|null, marketsRow?: MarketsRow): void => {
      if (err) return callback(err);
      if (!marketsRow) return callback(new Error("market min price, max price, and/or num ticks not found"));
      const minPrice = marketsRow.minPrice!;
      const maxPrice = marketsRow.maxPrice!;
      const numTicks = marketsRow.numTicks!;
      const ordersPayload = { _orderId: log.orderId };
      const tickSize = convertNumTicksToTickSize(numTicks, minPrice, maxPrice);
      const fullPrecisionAmount = convertOnChainSharesToHumanReadableShares(amount, tickSize);
      const fullPrecisionPrice = denormalizePrice(minPrice, maxPrice, convertFixedPointToDecimal(price, numTicks));
      const orderTypeLabel = orderType === "0" ? "buy" : "sell";
      const orderData: OrdersRow = {
        marketID,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        outcome,
        shareToken,
        orderCreator: log.creator,
        orderState: OrderState.OPEN,
        tradeGroupID: log.tradeGroupId,
        orderType: orderTypeLabel,
        price: formatOrderPrice(orderTypeLabel, minPrice, maxPrice, fullPrecisionPrice),
        amount: formatOrderAmount(fullPrecisionAmount),
        fullPrecisionPrice,
        fullPrecisionAmount,
        tokensEscrowed: convertFixedPointToDecimal(moneyEscrowed, WEI_PER_ETHER),
        sharesEscrowed: convertOnChainSharesToHumanReadableShares(sharesEscrowed, tickSize),
      };
      const orderID = { orderID: log.orderId };
      db.select("marketID").from("orders").where(orderID).asCallback((err: Error|null, ordersRows?: Array<Partial<OrdersRow>>): void => {
        if (err) return callback(err);
        let upsertOrder: QueryBuilder;
        if (!ordersRows || !ordersRows.length) {
          upsertOrder = trx.insert(Object.assign(orderData, orderID)).into("orders");
        } else {
          upsertOrder = db.from("orders").where(orderID).update(orderData);
        }
        upsertOrder.asCallback((err: Error|null): void => {
          if (err) return callback(err);
          augurEmitter.emit("OrderCreated", Object.assign(orderData, orderID));
          callback(null);
        });
      });
    });
  });
}

export function processOrderCreatedLogRemoval(db: Knex, augur: Augur, log: FormattedEventLog, callback: ErrorCallback): void {
  db.from("orders").where("orderID", log.orderId).update({ isRemoved: 1 }).asCallback((err: Error|null): void => {
    if (err) return callback(err);
    augurEmitter.emit("OrderCreated", log);
    callback(null);
  });
}
