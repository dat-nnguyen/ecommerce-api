import router from '../../src/routes/payment.routes.js';

describe('Payment Routes (Unit Tests)', () => {
  it('should define all required payment routes with expected HTTP methods', () => {
    const routes = router.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routes).toContainEqual({ path: '/process', methods: ['post'] });
    expect(routes).toContainEqual({ path: '/order/:orderId', methods: ['get'] });
    expect(routes).toContainEqual({ path: '/:id', methods: ['get'] });
    expect(routes).toContainEqual({ path: '/:id/refund', methods: ['post'] });
  });

  it('should register router-level authenticate middleware', () => {
    const middlewareLayers = router.stack.filter((layer) => !layer.route);
    expect(middlewareLayers.length).toBeGreaterThan(0);
  });
});
