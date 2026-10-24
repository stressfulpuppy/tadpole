<div align="center">

<img src=public/tadpole.svg alt="the tadpole wordmark" width=384>

tadpole is an open-source, self-hostable, and lightweight file server written in Astro. It authenticates with Discord and stores files alongside it.

<img src=public/homepage.png alt="a screenshot of tadpole's homepage" width=500>

</div>

## Setup

> [!NOTE]
> If you're hosting your own instance, please consider reading [the self-hosting guide](./HOSTING.md). Portions of this are copied from there.

### Pre-requisites

You should have a Discord account, a server to host tadpole on, and a domain.

Before anything, make sure you have [Node.js installed](https://nodejs.org/en). Then, install pnpm

```sh
npm install -g pnpm
```

### Configuration

Clone the repository and install its dependencies

```sh
git clone --depth 1 https://github.com/stressfulpuppy/tadpole
cd tadpole
pnpm install

# the below is optional, but recommended for deployment.
pnpm install -g pm2
```

Now, edit your `.env` file

```sh
cp example.env .env
nano .env # you can use any text editor for this
```

You should have a file along the lines of

```properties
CLIENTID=
CLIENTSECRET=
REDIRECT=
ADMIN_IDS=
ORIGIN=
```

Now, go to the [Discord Developer Portal](https://discord.com/developers/home), press 'Create,' and 'Create blank app'. Name it whatever you'd like &mdash; but remember, this name will be shown to your users. From here, you can change the profile picture if you'd like.

On the left, click 'OAuth2.' Under Client ID, press the blue copy button and note it down. Now, under Client Secret, press 'Reset Secret,' authenticate, and press the blue copy button. Note down the secret. These will be your `CLIENTID` and `CLIENTSECRET` respectively.

Scroll to Redirects, and press 'Add Redirect'. Type in your full path to tadpole, including `https`. For example, `https://tadpole.cattreats.dev`. Now, append `/api/callback`. This should leave you with something along the lines of `https://tadpole.cattreats.dev/api/callback`. This will be what you put as your `REDIRECT`. <!-- You may also wish to put a local IP address for testing &mdash; now would be the time to do that. For example, you could add `http://192.168.1.67:6767/api/callback`. -->

On Discord, follow [these instructions](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID) to enable Developer Mode and get your User ID. Note down your User ID, and any other person's who you wish to be an instance moderator. These will be what you put as your `ADMIN_IDS`, separated by a comma.

Finally, your ORIGIN will be the link to your tadpole homepage &mdash; for example, `https://tadpole.cattreats.dev`.

Now, back in your text editor, fill in the following lines with the information you got before. Below is a demo of what your file should look like afterwards.

<!-- these of course do not work, please don't try them -->

```properties
CLIENTID=1561435969243189359
CLIENTSECRET=-YSVqheZEVgjh5kIstvBKwvduOF75PO5
REDIRECT=https://tadpole.cattreats.dev/api/callback
ADMIN_IDS=1408956378600702042,997203884428767282
ORIGIN=https://tadpole.cattreats.dev
```

Now, if you would like to modify your instance rules, you can edit the rules file in `/src/docs/rules.md`.

Finally, you can build and prepare to deploy!

```sh
pnpm run build
pm2 start "pnpm run start" --name tadpole
# if you wish not to use pm2, use:
# pnpm run start
```

How you deploy publicly next is your choice &mdash; if you would like a guide that walks you through using Cloudflare Tunnels (the way the [official tadpole instance](https://tadpole.cattreats.dev/) is deployed), please view the [self-hosting guide](./HOSTING.md)

## Support

Make a GitHub issue, or find the contact for the instance you're using.

## Contributing

Before making a PR, please make sure you've disclosed if you used AI, and make sure you've checked any code output by AI before contributing it.

## Extra

Thanks to [@bearcattt](https://github.com/bearcattt) for helping a lot with backend, frontend, and everything!!! <3  
tadpole is released under the [Mozilla Public License v2](./LICENSE.md).
