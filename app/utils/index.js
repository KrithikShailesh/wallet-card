export const getCurrencySymbol = (currencyType) => {
  switch (currencyType) {
    case "gbp":
      return "£";
    case "usd":
      return "$";
    case "inr":
      return "₹";
    case "eur":
      return "€";
  }
};
