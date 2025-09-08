const AutoPromoSender = require('../Functions/AutoPromoSender');

// Minimal fake client with channels.fetch stub
const fakeClient = {
    channels: {
        fetch: async (id) => ({ id, name: 'test-channel', send: async (opts) => ({ id: 'msg123' }) })
    }
};

const sender = new AutoPromoSender(fakeClient);

try {
    console.log('Role message:');
    console.log(sender.getRolePromoMessage());
} catch (e) {
    console.error('Role message error:', e && e.stack ? e.stack : e);
}

try {
    console.log('Premium message:');
    console.log(sender.getPremiumPromoMessage());
} catch (e) {
    console.error('Premium message error:', e && e.stack ? e.stack : e);
}

process.exit(0);
