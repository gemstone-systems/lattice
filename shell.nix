{
  mkShellNoCC,

  # extra tooling
  eslint_d,
  prettierd,
  nodejs_24,
  pnpm,
  typescript,
  typescript-language-server,

  callPackage,
}:
let
  defaultPackage = callPackage ./default.nix { };
in
mkShellNoCC {
  inputsFrom = [ defaultPackage ];

  packages = [
    eslint_d
    prettierd
    nodejs_24
    pnpm
    typescript
    typescript-language-server
  ];

  shellHook = ''
    eslint_d start # start eslint daemon
    eslint_d status # inform user about eslint daemon status
  '';
}
