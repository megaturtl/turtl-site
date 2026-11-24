{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.services.turtl-site;
in
{
  options.services.turtl-site = {
    enable = lib.mkEnableOption "megaturtl's static personal site served by Nginx";

    hostName = lib.mkOption {
      type = lib.types.nonEmptyStr;
      example = "turtl.cc";
      description = "Name of the Nginx virtual host. Configure listeners and TLS on this virtual host.";
    };

    package = lib.mkOption {
      type = lib.types.package;
      default = pkgs.callPackage ../packages/turtl-site.nix { };
      defaultText = lib.literalExpression "pkgs.callPackage ../packages/turtl-site.nix { }";
      description = "Package containing the generated site at its root.";
    };
  };

  config = lib.mkIf cfg.enable {
    services.nginx = {
      enable = true;
      virtualHosts.${cfg.hostName} = {
        root = toString cfg.package;
        extraConfig = ''
          index index.html;
          gzip on;
          gzip_types text/plain text/css text/javascript application/javascript image/svg+xml;
        '';
        locations = {
          "/".tryFiles = "$uri $uri/ $uri.html =404";
          "~* \\.(html|css|js|jpg|jpeg|png|gif|svg|ico|woff2)$".extraConfig = ''
            expires 1y;
            add_header Cache-Control "public, immutable";
          '';
        };
      };
    };
  };
}
