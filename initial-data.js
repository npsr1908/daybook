window.INITIAL_DATA = {
  "currency": "INR",
  "accounts": [
    { "name": "HDFC Bank", "type": "Bank", "openingBalance": 0 },
    { "name": "HDFC CC", "type": "Card", "openingBalance": 0 },
    { "name": "Wallet", "type": "Cash", "openingBalance": 0 },
    { "name": "FD", "type": "Fixed Deposit", "openingBalance": 0 }
  ],
  "incomeCategories": ["Salary", "Interest", "Refund", "Other"],
  "expenseCategories": [
    { "name": "Home", "budget": 0 },
    { "name": "Food", "budget": 0 },
    { "name": "Transport", "budget": 0 },
    { "name": "Health", "budget": 0 },
    { "name": "Shopping", "budget": 0 },
    { "name": "Bills", "budget": 0 },
    { "name": "Entertainment", "budget": 0 },
    { "name": "Travel", "budget": 0 },
    { "name": "Savings", "budget": 0 },
    { "name": "Other", "budget": 0 }
  ],
  "subcategoriesByCategory": {
    "Home": ["Rent", "Maintenance"],
    "Food": ["Groceries", "Restaurant"],
    "Transport": ["Fuel", "Public transport"],
    "Health": ["Medicine", "Appointment"],
    "Shopping": ["Clothing", "Household items"],
    "Bills": ["Electricity", "Internet", "Phone"],
    "Entertainment": ["Movies", "Subscriptions"],
    "Travel": ["Tickets", "Accommodation"],
    "Savings": ["Investment", "Emergency savings"],
    "Other": []
  },
  "transferCategories": ["Bank transfer", "Credit card payment", "ATM withdrawal", "Autopay"],
  "transactions": [],
  "subcategoryCatalogVersion": 2
};

