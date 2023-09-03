//I have designed a mock API using mockapi.io the /cards enpoint will return all the card data I have configured
export const makeGetAllCardsApiCall = () => {
  const cards = fetch(
    "https://64f034268a8b66ecf7794444.mockapi.io/api/v1/cards",
    {
      method: "GET",
    }
  )
    .then((response) => response.json())
    .then((responseData) => {
      return responseData;
    });

  return cards;
};
