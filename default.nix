{ lib, buildNpmPackage }:

buildNpmPackage {
  pname = "lattice";
  version = "0.0.1";

  src = ./.;

  npmDepsHash = lib.fakeHash;

  meta = {
    description = "decentralised sync engine";
    homepage = "https://github.com/gemstone-systems/lattice";
    license = lib.licenses.mit;
    maintainers = with lib.maintainers; [ ];
    mainProgram = "example";
  };
}
