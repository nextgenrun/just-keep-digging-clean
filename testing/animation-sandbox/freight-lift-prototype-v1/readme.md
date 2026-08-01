# Freight Lift Prototype V1

This is an isolated, non-persistent Phaser feel test for the approved freight
lift concept. It uses the real pressure-foundry environment art, the approved
high-resolution freight-lift atlas, and the current UAL miner idle sheet.

Open `index.html` through the local project web server. The shaft is intentionally
about one-and-a-half camera heights tall: enough to prove a useful local
multi-screen route without implying that the full 5,000-tile world should be
served by one elevator.

Controls:

- `A` / `D`: walk within or away from the lift.
- `E`: ride to the other authored stop while standing on the platform.
- `R`: reset the prototype.

The platform moves physically with the miner. There is no jump, portal
transition, terrain mutation, save write, unlock, reward, or production
PlayScene registration. Removing this folder and
`values/freightLiftPrototype.js` rolls the prototype back completely.
