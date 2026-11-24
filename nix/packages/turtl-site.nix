{
  buildNpmPackage,
  importNpmLock,
  lib,
}:
let
  root = ../..;
  package = lib.importJSON (root + /package.json);
in
buildNpmPackage {
  pname = package.name;
  inherit (package) version;

  src = lib.fileset.toSource {
    inherit root;
    fileset = lib.fileset.unions [
      ../../.eleventy.js
      ../../package.json
      ../../package-lock.json
      ../../src
    ];
  };

  npmDeps = importNpmLock { npmRoot = root; };
  npmConfigHook = importNpmLock.npmConfigHook;

  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -r public/. "$out/"
    runHook postInstall
  '';

  meta.platforms = lib.platforms.linux;
}
