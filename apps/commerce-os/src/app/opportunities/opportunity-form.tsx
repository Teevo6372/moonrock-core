"use client";

import { useActionState } from "react";

import { evaluateOpportunityAction, type EvaluationState } from "./actions";

const initialState: EvaluationState = { status: "idle" };

type Options = {
  products: Array<{ id: string; name: string; productType: string }>;
  suppliers: Array<{ id: string; name: string }>;
  marketplace: { name: string; feeProfileName: string };
};

function ErrorText({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

export function OpportunityForm({ options }: { options: Options }) {
  const [state, action, pending] = useActionState(
    evaluateOpportunityAction,
    initialState,
  );
  const observedAt = new Date().toISOString().slice(0, 16);

  return (
    <form action={action} aria-describedby="form-guidance">
      <p id="form-guidance" className="muted">
        Select an existing record or enter a new one. Financial fields use USD;
        rates use decimals (13% = 0.13).
      </p>
      {state.message && (
        <div
          className={`notice ${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </div>
      )}

      <fieldset>
        <legend>Product</legend>
        <label htmlFor="productId">Existing product</label>
        <select id="productId" name="productId">
          <option value="">Create a new product</option>
          {options.products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.productType.replaceAll("_", " ")})
            </option>
          ))}
        </select>
        <label htmlFor="productName">New product name</label>
        <input id="productName" name="productName" />
        <ErrorText message={state.errors?.productName} />
        <div className="grid">
          <div>
            <label htmlFor="productType">Product type</label>
            <select
              id="productType"
              name="productType"
              defaultValue="single_card"
            >
              <option value="single_card">Single card</option>
              <option value="sealed_product">Sealed product</option>
              <option value="accessory">Accessory</option>
              <option value="bundle">Bundle</option>
              <option value="custom_deck">Custom deck</option>
            </select>
            <ErrorText message={state.errors?.productType} />
          </div>
          <div>
            <label htmlFor="game">Game</label>
            <input id="game" name="game" defaultValue="Magic: The Gathering" />
          </div>
          <div>
            <label htmlFor="condition">Condition</label>
            <input id="condition" name="condition" defaultValue="New" />
            <ErrorText message={state.errors?.condition} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Supplier and acquisition</legend>
        <label htmlFor="supplierId">Existing supplier</label>
        <select id="supplierId" name="supplierId">
          <option value="">Create a new supplier</option>
          {options.suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
        <div className="grid">
          <div>
            <label htmlFor="supplierName">New supplier name</label>
            <input id="supplierName" name="supplierName" />
            <ErrorText message={state.errors?.supplierName} />
          </div>
          <div>
            <label htmlFor="supplierUrl">Supplier URL</label>
            <input id="supplierUrl" name="supplierUrl" type="url" />
          </div>
          <div>
            <label htmlFor="quantity">Quantity</label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              defaultValue="1"
            />
            <ErrorText message={state.errors?.quantity} />
          </div>
          <div>
            <label htmlFor="unitCost">Unit cost</label>
            <input id="unitCost" name="unitCost" inputMode="decimal" required />
            <ErrorText message={state.errors?.unitCost} />
          </div>
          <div>
            <label htmlFor="inboundShippingTotal">Inbound shipping total</label>
            <input
              id="inboundShippingTotal"
              name="inboundShippingTotal"
              defaultValue="0"
            />
          </div>
          <div>
            <label htmlFor="acquisitionTaxTotal">Acquisition tax total</label>
            <input
              id="acquisitionTaxTotal"
              name="acquisitionTaxTotal"
              defaultValue="0"
            />
          </div>
          <div>
            <label htmlFor="otherAcquisitionCostTotal">
              Other acquisition costs
            </label>
            <input
              id="otherAcquisitionCostTotal"
              name="otherAcquisitionCostTotal"
              defaultValue="0"
            />
          </div>
          <div>
            <label htmlFor="observedAt">Observed at</label>
            <input
              id="observedAt"
              name="observedAt"
              type="datetime-local"
              defaultValue={observedAt}
            />
            <ErrorText message={state.errors?.observedAt} />
          </div>
        </div>
        <label htmlFor="evidenceReference">Evidence note or reference</label>
        <textarea id="evidenceReference" name="evidenceReference" rows={3} />
      </fieldset>

      <fieldset>
        <legend>Marketplace assumptions</legend>
        <p className="muted">
          Target: {options.marketplace.name}. Fee profile loaded server-side:{" "}
          {options.marketplace.feeProfileName}.
        </p>
        <div className="grid">
          <div>
            <label htmlFor="expectedUnitSalePrice">
              Expected unit sale price
            </label>
            <input
              id="expectedUnitSalePrice"
              name="expectedUnitSalePrice"
              required
            />
            <ErrorText message={state.errors?.expectedUnitSalePrice} />
          </div>
          <div>
            <label htmlFor="buyerShippingRevenuePerUnit">
              Buyer shipping revenue per unit
            </label>
            <input
              id="buyerShippingRevenuePerUnit"
              name="buyerShippingRevenuePerUnit"
              defaultValue="0"
            />
          </div>
          <div>
            <label htmlFor="promotedListingRate">Promoted listing rate</label>
            <input
              id="promotedListingRate"
              name="promotedListingRate"
              defaultValue="0"
            />
            <ErrorText message={state.errors?.promotedListingRate} />
          </div>
          <div>
            <label htmlFor="outboundShippingPerOrder">
              Outbound shipping per order
            </label>
            <input
              id="outboundShippingPerOrder"
              name="outboundShippingPerOrder"
              defaultValue="7.00"
            />
          </div>
          <div>
            <label htmlFor="packagingCostPerOrder">Packaging per order</label>
            <input
              id="packagingCostPerOrder"
              name="packagingCostPerOrder"
              defaultValue="0.50"
            />
          </div>
          <div>
            <label htmlFor="otherSellingCostPerOrder">
              Other selling cost per order
            </label>
            <input
              id="otherSellingCostPerOrder"
              name="otherSellingCostPerOrder"
              defaultValue="0"
            />
          </div>
          <div>
            <label htmlFor="minimumNetProfit">
              Minimum net profit per unit
            </label>
            <input
              id="minimumNetProfit"
              name="minimumNetProfit"
              defaultValue="0"
            />
          </div>
          <div>
            <label htmlFor="minimumRoi">Minimum ROI</label>
            <input id="minimumRoi" name="minimumRoi" defaultValue="0.30" />
          </div>
        </div>
      </fieldset>

      {state.warnings?.map((warning) => (
        <div className="notice warning" role="status" key={warning}>
          {warning}
        </div>
      ))}
      <div className="actions">
        <button type="submit" name="_intent" value="draft" disabled={pending}>
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button
          type="submit"
          name="_intent"
          value="evaluate"
          disabled={pending}
        >
          {pending ? "Evaluating…" : "Evaluate and save"}
        </button>
      </div>

      {state.result && (
        <section className="result" aria-labelledby="result-heading">
          <h2 id="result-heading">Evaluation result</h2>
          <dl>
            <div>
              <dt>Net profit</dt>
              <dd>${state.result.expectedNetProfit}</dd>
            </div>
            <div>
              <dt>ROI</dt>
              <dd>{state.result.roi}</dd>
            </div>
            <div>
              <dt>Margin</dt>
              <dd>{state.result.margin}</dd>
            </div>
            <div>
              <dt>Break-even item price</dt>
              <dd>${state.result.breakEvenItemPrice}</dd>
            </div>
            <div>
              <dt>Minimum acceptable item price</dt>
              <dd>${state.result.minimumAcceptableItemPrice}</dd>
            </div>
          </dl>
          <p className="muted">Opportunity ID: {state.opportunityId}</p>
        </section>
      )}
    </form>
  );
}
