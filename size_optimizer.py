
# size_optimizer.py
# Minimal Python helper to choose an optimal flash-loan size from candidate amounts.
# Drop this file into your project's `sim/` folder and run:  python sim/size_optimizer.py

from decimal import Decimal, getcontext
getcontext().prec = 50  # high precision for bps math

def optimal_size(candidates, quote_func, fees):
    """
    candidates: list of str, e.g. ["5000","10000","20000"]
    quote_func: callable(Decimal) -> Decimal  (returns round-trip output units)
    fees: dict with keys: aave_bps, v3_fee, v2_fee, extra_bps
    """
    best_amt = Decimal(0)
    best_profit = Decimal("-1e50")
    for s in candidates:
        amt = Decimal(s)
        out = quote_func(amt)
        gross = out - amt
        costs = (amt * Decimal(fees["aave_bps"]) / Decimal(10_000)
               + amt * Decimal(fees["v3_fee"])   / Decimal(10_000)
               + amt * Decimal(fees["v2_fee"])   / Decimal(10_000)
               + amt * Decimal(fees["extra_bps"]) / Decimal(10_000))
        net = gross - costs
        if net > best_profit:
            best_profit = net
            best_amt = amt
    return best_amt, best_profit

# Example usage with a dummy quote function
if __name__ == "__main__":
    # Fake quotes: 0.08% edge that decays as size grows
    def dummy_quote(amt):
        edge_bps = Decimal(8) - (amt / Decimal(100_000))  # toy decay
        return amt * (Decimal(1) + edge_bps / Decimal(10_000))

    fees = {"aave_bps": 9, "v3_fee": 5, "v2_fee": 25, "extra_bps": 10}
    candidates = ["5000","10000","20000","40000","80000"]
    best_amt, best_profit = optimal_size(candidates, dummy_quote, fees)
    print("best_amt:", best_amt, "net_profit_units:", best_profit)
