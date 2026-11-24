{
  description = "Turtl Site: Eleventy build, NixOS module, and development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      ...
    }:
    {
      nixosModules.default = import ./nix/modules/turtl-site.nix;
    }
    // flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        nodejs = pkgs.nodejs_22;

        devServer = pkgs.writeShellApplication {
          name = "dev-server";
          runtimeInputs = [ nodejs ];
          text = ''
            npm install
            npm run dev
          '';
        };
      in
      {
        # `nix develop` drops you into a shell with node/npm on PATH
        devShells.default = pkgs.mkShell {
          packages = [ nodejs ];
        };

        # `nix run` installs deps and starts the dev server directly
        apps.default = flake-utils.lib.mkApp {
          drv = devServer;
        };
      }
      //
        nixpkgs.lib.optionalAttrs
          (builtins.elem system [
            "x86_64-linux"
            "aarch64-linux"
          ])
          {
            packages.default = pkgs.callPackage ./nix/packages/turtl-site.nix { };
          }
    );
}
