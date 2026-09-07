const assert = require('node:assert/strict');
const { test } = require('node:test');
const manifest = require('../package.json');

test('starts independently of save commands so automatic saves can be observed', () => {
    assert.deepEqual(manifest.activationEvents, ['*']);
});
