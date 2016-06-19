BoomBot
=======
Hearthstone irc bot, resident of #hearthsim on freenode


Install
-------
Requires Node 6. Clone (or download) the repo, install dependencies:

    npm install --no-optional


Configure and Run
-----------------
Edit the `config` object in `package.json` (see [node-irc docs]), then start:

    npm start


Community
---------
Join us in [#hearthsim on freenode].
PRs welcome, please eslint using the [default airbnb styleguide].


License
-------
MIT


[#hearthsim on freenode]:
  https://webchat.freenode.net/?channels=hearthsim

[node-irc docs]:
  https://node-irc.readthedocs.io/en/latest/API.html#irc.Client

[default airbnb styleguide]:
  https://www.npmjs.com/package/eslint-config-airbnb
  "inexplicably, the least bad I could find. still better than inventing my own"
