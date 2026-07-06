import unittest
from collections import defaultdict
from datetime import datetime


def count_income_months(transactions):
    monthly = defaultdict(float)
    for tx in transactions:
        if tx["type"] != "gelir":
            continue
        month_key = tx["date"].split("T")[0][:7]
        monthly[month_key] += tx["amount"]
    return len(monthly)


class ForecastMonthGateTests(unittest.TestCase):
    def test_requires_three_distinct_months(self):
        txs = [
            {"date": "2026-01-15", "amount": 1000, "type": "gelir"},
            {"date": "2026-02-10", "amount": 1200, "type": "gelir"},
        ]
        self.assertEqual(count_income_months(txs), 2)

    def test_passes_with_three_months(self):
        txs = [
            {"date": "2026-01-15", "amount": 1000, "type": "gelir"},
            {"date": "2026-02-10", "amount": 1200, "type": "gelir"},
            {"date": "2026-03-05", "amount": 900, "type": "gelir"},
        ]
        self.assertEqual(count_income_months(txs), 3)


if __name__ == "__main__":
    unittest.main()