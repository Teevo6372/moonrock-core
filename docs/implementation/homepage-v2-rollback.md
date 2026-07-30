# Moonrock Marketing Homepage v2 Rollback

## Fast presentation rollback

If the new homepage has a problem after activation:

1. Open WordPress **Settings → Reading**.
2. Restore the previously recorded static homepage.
3. Save changes.
4. Purge WordPress, Elementor, XStore, server, and CDN caches.
5. Confirm the old homepage and WooCommerce checkout operate normally.

This restores the visitor-facing homepage without deleting the v2 review page
or changing any other content.

## Child-theme file rollback

Use the FusionArc/JetBackup restore point taken immediately before deployment,
limited to the paths in `deployments/homepage-v2-manifest.txt`.

For a Git-based rollback, prepare a reviewed rollback branch that restores only
those manifest paths to the last approved commit, then use the same manual
deployment workflow. Do not restore all of `wp-content`, WordPress core,
plugins, uploads, `wp-config.php`, or the database.

After restoring the files:

1. Clear Elementor generated CSS/data.
2. Purge all caches.
3. Verify PHP logs contain no new fatal errors.
4. Recheck the old homepage, Shop, product, cart, checkout, Blog, About,
   Contact, account, and legal pages.

## Elementor cleanup

The imported Elementor template is marked:

```text
moonrock_deployment_package = homepage-v2
```

Deleting that library template is optional and must happen only after the old
homepage is active. Do not delete the WordPress review page until its content
has been exported or it is no longer needed.

## Recovery boundary

This rollback is intentionally narrow. If unrelated production data or files
are damaged, stop and use FusionArc/JetBackup rather than broadening this
homepage rollback.
