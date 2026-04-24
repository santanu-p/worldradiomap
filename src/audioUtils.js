export function smoothAudioParam(param, value, ramp = 0.05, fallbackContext = null) {
  const now = param?.context?.currentTime ?? fallbackContext?.currentTime ?? 0;
  const currentValue = Number.isFinite(param?.value) ? param.value : value;
  param.cancelScheduledValues(now);
  param.setValueAtTime(currentValue, now);
  param.linearRampToValueAtTime(value, now + ramp);
}
