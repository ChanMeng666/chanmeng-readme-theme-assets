# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-04

### Added
- Claude Code plugin packaging: `.claude-plugin/plugin.json` and `marketplace.json`. Install with
  `/plugin install chanmeng-readme-theme-assets --marketplace ChanMeng666/chanmeng-readme-theme-assets`. The repo, marketplace, plugin and skill all
  use the name `chanmeng-readme-theme-assets`. The manual `git clone` install still works as before.
- CI runs `claude plugin validate --strict` on the manifests.
- A plugin icon, `.claude-plugin/icon.png`: the Chan Meng monkey on a Caldera palette colour, so catalogs show it instead of a letter.

