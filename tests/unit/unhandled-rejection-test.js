import { __unhandledRejectionHandler__ } from 'ember-qunit';
import { Promise as RSVPPromise } from 'rsvp';
import { module, test } from 'qunit';

const HAS_NATIVE_PROMISE = typeof Promise !== 'undefined';
const HAS_UNHANDLED_REJECTION_HANDLER = 'onunhandledrejection' in window;

module('unhandle promise rejections', function(hooks) {
  hooks.beforeEach(function(assert) {
    let originalPushResult = assert.pushResult;
    assert.pushResult = function(resultInfo) {
      // Inverts the result so we can test failing assertions
      resultInfo.result = !resultInfo.result;
      resultInfo.message = `Failed: ${resultInfo.message}`;
      originalPushResult(resultInfo);
    };
  });

  test('RSVP promises cause an unhandled rejection', function(assert) {
    let done = assert.async();

    // ensure we do not exit this test until the assertion has happened
    setTimeout(done, 10);

    new RSVPPromise(resolve => {
      setTimeout(resolve);
    }).then(function() {
      throw new Error('whoops!');
    });
  });

  if (HAS_NATIVE_PROMISE && HAS_UNHANDLED_REJECTION_HANDLER) {
    test('native promises cause an unhandled rejection', function(assert) {
      let done = assert.async();

      // ensure we do not exit this test until the assertion has happened
      setTimeout(done, 10);

      new self.Promise(resolve => {
        setTimeout(resolve);
      }).then(function() {
        throw new Error('whoops!');
      });
    });
  }
});

if (HAS_NATIVE_PROMISE && HAS_UNHANDLED_REJECTION_HANDLER) {
  module('unhandled native promise rejection outside of test context', function(hooks) {
    var originalPushResult;

    hooks.beforeEach(function(assert) {
      // Duck-punch pushResult so we can check test name and assert args.
      originalPushResult = assert.pushResult;

      assert.pushResult = function(resultInfo) {
        // Restore pushResult for this assert object, to allow following assertions.
        this.pushResult = originalPushResult;

        this.strictEqual(this.test.testName, 'global failure', 'Test is appropriately named');

        this.deepEqual(
          resultInfo,
          {
            message: 'Error message',
            source: 'filePath.js:1',
            result: false,
            actual: {
              message: 'Error message',
              fileName: 'filePath.js',
              lineNumber: 1,
              stack: 'filePath.js:1',
            },
          },
          'Expected assert.pushResult to be called with correct args'
        );
      };
    });

    hooks.afterEach(function() {
      QUnit.config.current.pushResult = originalPushResult;
    });

    // Actual test (outside QUnit.test context)
    __unhandledRejectionHandler__({
      reason: {
        message: 'Error message',
        fileName: 'filePath.js',
        lineNumber: 1,
        stack: 'filePath.js:1',
      },
    });
  });
}
