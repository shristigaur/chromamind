// simple import test to catch syntax errors
import('./models/index.js')
  .then((models) => {
    console.log('Models loaded:', Object.keys(models));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error loading models:', err);
    process.exit(1);
  });
