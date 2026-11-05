// Independent check of the FPS movement frame.
// Camera forward (0,0,-1), up (0,1,0) => right = forward × up = (1,0,0).
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}
const fwd = [0, 0, -1];
const up = [0, 1, 0];
const right = cross(fwd, up);
if (right[0] !== 1 || right[1] !== 0 || right[2] !== 0) {
  console.error('FRAME_FAIL', right);
  process.exit(1);
}
const left = cross(up, fwd);
if (left[0] !== -1) {
  console.error('LEFT_FAIL', left);
  process.exit(1);
}
console.log('FRAME_OK', right.join(','));
