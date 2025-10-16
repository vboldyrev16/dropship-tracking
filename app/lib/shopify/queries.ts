export const GET_ORDER_QUERY = `
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      name
      lineItems(first: 50) {
        edges {
          node {
            id
            title
            quantity
            image {
              url
              altText
            }
          }
        }
      }
    }
  }
`;
