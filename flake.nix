{
  description = "Turtl Site: Eleventy build, NixOS module, and development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = {nixpkgs, ...}: let
    lib = nixpkgs.lib;
    systems = [
      "x86_64-linux"
      "aarch64-linux"
    ];
    forEachSystem = lib.genAttrs systems;
    forEachDevSystem = lib.genAttrs (systems ++ ["aarch64-darwin"]);
    pkgsFor = system: nixpkgs.legacyPackages.${system};
  in {
    nixosModules.default = import ./nix/modules/turtl-site.nix;

    packages = forEachSystem (
      system: let
        pkgs = pkgsFor system;
      in rec {
        turtl-site = pkgs.callPackage ./nix/packages/turtl-site.nix {};
        default = turtl-site;
      }
    );

    devShells = forEachDevSystem (
      system: let
        pkgs = pkgsFor system;
      in {
        default = pkgs.mkShell {
          packages = [pkgs.nodejs];
        };
      }
    );

    apps = forEachDevSystem (
      system: let
        pkgs = pkgsFor system;
        devServer = pkgs.writeShellApplication {
          name = "dev-server";
          runtimeInputs = [pkgs.nodejs];
          text = ''
            npm install
            npm run dev
          '';
        };
      in {
        default = {
          type = "app";
          program = lib.getExe devServer;
          meta.description = "Start the Eleventy development server";
        };
      }
    );
  };
}
