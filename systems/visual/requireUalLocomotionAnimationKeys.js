export function requireUalLocomotionAnimationKeys(profile) {
  const keys = {
    idle: profile?.idleAnim,
    walkStart: profile?.walkStartAnim,
    walkLoop: profile?.walkLoopAnim,
    run: profile?.walkRunAnim,
    walkStop: profile?.walkStopAnim,
    flightEnter: profile?.flightEnterAnim,
    flightTravelEnter: profile?.flightTravelEnterAnim,
    flightTravelLoop: profile?.flightTravelLoopAnim,
    flightHover: profile?.flightHoverAnim,
    flightExit: profile?.flightExitAnim,
    airborneRise: profile?.airborneRiseAnim,
    airborneFall: profile?.airborneFallAnim,
    landing: profile?.landingAnim,
  };
  const missing = Object.entries(keys)
    .filter(([, value]) => typeof value !== "string" || value.length === 0)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`UAL locomotion profile is missing animation keys: ${missing.join(", ")}`);
  }
  return Object.freeze(keys);
}
