<div align="center">

<img src=public/tadpole.svg alt="the tadpole wordmark" width=384>

tadpole is an open-source, self-hostable, and lightweight file server written in Astro. It authenticates with Discord and stores files alongside it.

<img src=public/homepage.png alt="a screenshot of tadpole's homepage" width=500>

</div>

## Self-hosting

Starting a tadpole server can be done in just a few easy steps :3

> [!NOTE]
> If you're hosting your own instance, please consider reading [the self-hosting guide](./HOSTING.md)

### Dependencies

You'll need `pnpm` for this. You can get it by [installing Node.js](https://nodejs.org/en) and running `npm install -g pnpm`.

### Getting Started

First, you'll need to get a couple things &mdash; a Client ID, a Client Secret, and a domain. You can get the first two from the [Discord Developer Portal](https://discord.com/developers/home), on the OAuth2 page, and the latter will be the domain you're hosting it on.

Copy the `example.env` into `.env`, then set your CLIENTID and CLIENTSECRET to the strings you got above. For REDIRECT, you should put something along the lines of `https://tadpole.cattreats.dev/api/callback`, of course replacing `tadpole.cattreats.dev` for your own domain. Also add this URL to your Discord app's Redirects. It should be directly under where you got your Client ID and Secret on the OAuth2 page. Don't forget to make yourself admin, along with anyone else you want to help moderate. You do this by setting ADMIN_IDS to your own ID and any others, separated by comma.

```sh
pnpm install # installs all packages
pnpm build # here, it will build the static parts of tadpole
pnpm run start # finally, your instance of tadpole is started!
```

To stay online across restarts, you can use a tool such as [pm2](https://pm2.keymetrics.io/) &mdash; for example, running `pm2 start "pnpm run start" --name tadpole`

## Extra

Thanks to [@bearcattt](https://github.com/bearcattt) for helping a lot with backend, frontend, and everything!!! <3  
tadpole is released under the [Mozilla Public License v2](./LICENSE.md).
