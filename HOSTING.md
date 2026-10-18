<!-- I didn't use AI to write this, so please don't think I did :3 󰄛 -->

# Hosting a tadpole Instance

This guide is intended to help a user, from start to finish, configure their tadpole instance with <!-- either Caddy or --> Cloudflare Tunnels. :D

## Pre-requisites

You should have a Discord account, a server to host tadpole on, and a domain.

Before anything, make sure you have [Node.js installed](https://nodejs.org/en). Then, install pnpm

```sh
npm install -g pnpm
```

## Configuration

Clone the repository and install its dependencies

```sh
git clone --depth 1 https://github.com/stressfulpuppy/tadpole
cd tadpole
pnpm install

# the below is optional, but recommended for this guide.
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

<!-- If you will be using Caddy, -->

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

<!--
I am genuinely unsure of if Caddy's reverse proxy works with this and I don't have an environment to test

## Platform-specific Instructions

### Caddy

[Install Caddy](https://caddyserver.com/docs/install) and find your Caddyfile (usually /etc/caddy/Caddyfile). Get the `ORIGIN` you used above, minus the `https://`, and put it here

```caddyfile
tadpole.cattreats.dev {
    reverse_proxy http://localhost:6767
}
``` -->

## Using Cloudflare Tunnels

Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and sign in. On the left, scroll to 'Networking', expand it, and press 'Tunnels'. Now, on the page, there should be a blue button that says '+ Create Tunnel' &mdash; click that. Name it whatever - I'll name mine 'tadpole'. Pick your OS, architecture, etc., and run the 3 commands it lists.

Now, back on the tunnels list, press the 3 dots, then 'Configure'. Next, press 'Add Route', choose 'Published application,' pick the same domain and subdomain we chose above, and under Service URL enter 'http://localhost:6767'.

And... you're done! You should have a deployment
