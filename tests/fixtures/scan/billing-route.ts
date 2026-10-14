router.post('/billing/charge', async (req, res) => {
  await stripe.charges.create({ amount: req.body.amount });
});
