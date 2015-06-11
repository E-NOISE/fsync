# fsync

## Install

```sh
npm install -g fsync
```

## Usage

```
Usage: fsync [ options ] <command>

Commands:

active [ <name> ]
  Get/set active ftp site.

add <name> <url>
  Add new ftp site.

config [ <key> ] [ <value> ]
  Get/set configuration.

diff [ <name> ]
  Show differences between local and remote.

help [ <topic> ]
  Show help.

ls [ <name> ] [ <path> ]
  List ftp sites.

pull [ <name> ] <remote-path> <local-path>
  Pull files from remote.

push [ <name> ]
  Push files to remote.

rm [ <name> ]
  Remove ftp site.

Command specific help:

Each command has it's own help text. Use `fsync help <cmd>`
to display it. For example:

  fsync help config

Global Options:

-c, --confdir      Optional path to alternative config dir.
-v, --version      Show version.
--no-color         Disable pretty colours in output.
--disable-updates  Do not check for fsync updates.
```
