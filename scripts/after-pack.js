// electron-builder afterPack hook.
// Puts the cat icon and version info into PixelCat.exe using resedit (pure JS),
// so Windows builds also work on Linux/macOS without Wine.
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const ResEdit = await import('resedit');
  const { productFilename, productName, version } = context.packager.appInfo;
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`);

  const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exe);

  // icon
  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.ico')));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const groupId = groups.length ? groups[0].id : 1;
  const lang = groups.length ? groups[0].lang : 1033;
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    res.entries,
    groupId,
    lang,
    iconFile.icons.map((i) => i.data),
  );

  // version info shown in the file's Properties dialog
  const [vi] = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  if (vi) {
    const [major = 0, minor = 0, patch = 0] = version.split('.').map((n) => parseInt(n, 10) || 0);
    vi.setFileVersion(major, minor, patch, 0);
    vi.setProductVersion(major, minor, patch, 0);
    for (const l of vi.getAllLanguagesForStringValues()) {
      vi.setStringValues(l, {
        ProductName: productName,
        FileDescription: productName,
        InternalName: productName,
        OriginalFilename: `${productFilename}.exe`,
        CompanyName: productName,
        LegalCopyright: '',
        FileVersion: version,
        ProductVersion: version,
      });
    }
    vi.outputToResourceEntries(res.entries);
  }

  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
  console.log(`  • afterPack: set icon (group ${groupId}) and version ${version} on ${path.basename(exePath)}`);
};
