<?php
/**
 * Template Name: Moonrock Marketing Homepage
 * Template Post Type: page
 *
 * Repository-controlled homepage presentation. The XStore header and footer
 * remain active, and no WordPress content or WooCommerce state is modified.
 *
 * @package Moonrock
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="primary" class="mr-homepage" tabindex="-1">
	<?php require get_stylesheet_directory() . '/template-parts/moonrock-homepage-content.php'; ?>
</main>
<?php
get_footer();
