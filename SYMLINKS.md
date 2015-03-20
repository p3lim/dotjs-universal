### How to make a symbolic link

Before making these links, please browse to the extension directory and delete the original scripts and styles directories, as this process might not be able to overwrite them properly.

You can find those links, and you will need them for this process, in the options (Settings > Extensions > dotjs universal > Options)

After this, you can access all your files at wherever you chose `<secure_directory>` to be.

A good choice for this directory is `~/.dotjs` on Linux, you can probably come up with good equivalents for your operating system of choice.

## Windows

```bash
mklink /D "<scripts_directory>" "<secure_directory>\scripts"
mklink /D "<styles_directory>" "<secure_directory>\styles"
```

## Linux and OS X

```bash
ln -s "<secure_directory>/scripts" "<scripts_directory>"
ln -s "<secure_directory>/styles" "<styles_directory>"
```

### Note:

Every time this extension is updated, these symlinks are destroyed, so you'll have to make a new one every time.

Don't blame me for this, point your dirty fingers toward Google for making this browser so darn secure!
