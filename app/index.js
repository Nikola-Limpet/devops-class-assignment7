const express = require('express');
const app = express();
const PORT = 5000;

app.use(express.json());

// GET /menu - Returns food menu
app.get('/menu', (req, res) => {
  res.json({
    success: true,
    menu: [
      { id: 1, name: 'Burger', price: 8.99, category: 'Main Course' },
      { id: 2, name: 'Pizza', price: 12.99, category: 'Main Course' },
      { id: 3, name: 'Pasta', price: 10.99, category: 'Main Course' },
      { id: 4, name: 'Caesar Salad', price: 7.49, category: 'Appetizer' },
      { id: 5, name: 'Ice Cream', price: 4.99, category: 'Dessert' }
    ]
  });
});

// GET /orders - Returns current orders
app.get('/orders', (req, res) => {
  res.json({
    success: true,
    orders: [
      { id: 101, item: 'Burger', quantity: 2, status: 'Preparing' },
      { id: 102, item: 'Pizza', quantity: 1, status: 'Delivered' },
      { id: 103, item: 'Pasta', quantity: 3, status: 'Out for Delivery' }
    ]
  });
});

// GET /restaurants - Returns partner restaurants
app.get('/restaurants', (req, res) => {
  res.json({
    success: true,
    restaurants: [
      { id: 1, name: 'Pizza Palace', cuisine: 'Italian', rating: 4.5 },
      { id: 2, name: 'Burger Barn', cuisine: 'American', rating: 4.2 },
      { id: 3, name: 'Sushi Station', cuisine: 'Japanese', rating: 4.8 }
    ]
  });
});

// POST /order - Place a new order (Task 11)
app.post('/order', (req, res) => {
  const { item, quantity } = req.body;
  res.json({
    success: true,
    message: 'Order placed successfully!',
    order: {
      id: Math.floor(Math.random() * 1000),
      item: item || 'Unknown Item',
      quantity: quantity || 1,
      status: 'Received'
    }
  });
});

 // PUT /order/:id - Update an existing order
  app.put('/order/:id', (req, res) => {
    const { id } = req.params;
    const { item, quantity } = req.body;
    res.json({
      success: true,
      message: `Order ${id} updated successfully!`,
      order: {
        id: parseInt(id),
        item: item || 'Updated Item',
        quantity: quantity || 1,
        status: 'Updated'
      }
    });
  });

  // DELETE /order/:id - Cancel an order
  app.delete('/order/:id', (req, res) => {
    const { id } = req.params;
    res.json({
      success: true,
      message: `Order ${id} cancelled successfully!`
    });
  });


app.listen(PORT, () => {
  console.log(`FoodExpress API is running on http://localhost:${PORT}`);
});
