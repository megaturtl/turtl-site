# MegaTurtl's Website

First time 11ty project for my personal website!

Builds an easily deployable static site based on components, data, and templates.

I also have some dumb stuff like python scripts to generate some stuff.

The following is for when I inevitably leave my site for months, come back, and forget how the project works...

## Project Structure

```
.
├── src/                        
│   ├── _includes/              # Templates and reusable components
│   │   ├── layouts/            # Base page layouts and templates
│   │   └── components/         # Reusable page components (header, footer, etc.)
│   ├── _data/                  # Global data files accessible in templates
│   │   └── site.js             # Site-wide configuration and data (site name, logo url, etc.)
│   ├── assets/                 
│   │   ├── css/               
│   │   │   ├── themes/         # Theme-specific styles 
│   │   │   ├── pages/          # Page-specific styles
│   │   │   ├── components/     # Component-specific styles
│   │   │   ├── base.css        # Base styles and resets
│   │   │   └── vars.css        # CSS variables for fonts, sizing, spacing, etc.
│   │   ├── js/               
│   │   ├── images/           
│   │   ├── fonts/            
│   │   └── favicons/         
│   └── pages/                  # Individual page content
├── build-scripts/              # Build process utilities (minification, etc.)
├── .eleventy.js                # 11ty configuration
├── package.json                
├── package-lock.json           
└── README.md                   
```


## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Hosting on NixOS

Add the site as an input in the host flake:

```nix
inputs.turtl-site = {
  url = "github:megaturtl/turtl-site";
  inputs.nixpkgs.follows = "nixpkgs";
};
```

Add `inputs.turtl-site.nixosModules.default` to the host's module list and configure:

```nix
{
  services.turtl-site = {
    enable = true;
    hostName = "turtl.cc";
  };
}
```

This serves the site with Nginx. Configure listeners and TLS on
`services.nginx.virtualHosts."turtl.cc"` and manage DNS and firewall rules on the host.

## Adding New Pages

Create new `.njk` or `.md` files in the `src/pages` directory. They will automatically use the base layout if you include the front matter:

```yaml
---
layout: layouts/base.njk
title: Example Page Title
---
```

## Build Features

Automatic minification for:
- HTML
- CSS
- JavaScript