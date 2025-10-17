# For Lattice development

This is a guide to get you bootstrapped for development on Lattice. You don't _have_ to install [nix](https://nixos.org/download/), particularly if you're on Windows and not using WSL, but it would make your life easier. (also please use [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) for your own sanity).

If you're on Nix, setting up your dev environment is as easy as performing the following.

```bash
nix develop
pnpm install
pnpm bootstrap
```

## Bootstrapping

The bootstrapper will ask for your ATProto handle and password. This is only used to add a minimial number of records to your PDS required for development on Lattice. The bootstrapper will also ask you where you want to store your messages. If you give an empty string, it will point to the currently running production Shard. You can provide `localhost:<port>` or any other URL to use the Shard there.

The records on your PDS that are added by the bootstrapper are as follows:

1. A [`lattice`](https://github.com/gemstone-systems/lexicons/blob/main/lexicons/systems/gmstn/development/lattice.json) record pointing to `localhost:3000`.
2. A [`shard`](https://github.com/gemstone-systems/lexicons/blob/main/lexicons/systems/gmstn/development/shard.json) record pointing to the Shard provided earlier in the bootstrapper.
3. A [`channel`](https://github.com/gemstone-systems/lexicons/blob/main/lexicons/systems/gmstn/development/channel.json) record where the `routeThrough` field is set to the Lattice record created in step 1, and the `storeAt` field is set to the Shard record created in step 2.

You may verify the script that creates the records in `scripts/bootstrap-local-dev.ts`.

If you've already bootstrapped for Shard, then you can either delete the `shard` and `channel` records on your PDS created by the Lattice bootstrapper, or skip the bootstrapper and manually create a `lattice` record yourself that points to `localhost:3000`. Either way, you will need to then edit the `channel` record on your PDS to change the `routeThrough` field to the `localhost:3000` Lattice.

If you want to automate this, you can run `pnpm bootstrap/from-shard`, which runs `scripts/bootstrap-from-local-shard.ts`.

## Development

In order to actually access the Lattice and the development channels you've made, you'll need to either log in to the production Gemstone frontend at `https://app.gmstn.systems/` or run a local copy of the frontend from [here](https://github.com/gemstone-systems/gemstone-app). You will find the development channels listed under your repository. 
