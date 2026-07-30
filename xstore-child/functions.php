<?php
/**
 * Moonrock — XStore Child Theme
 *
 * Minimal, idempotent theme functions.
 * No automatic creation, deletion, renaming, or reorganisation of
 * WooCommerce categories, products, or taxonomies.
 *
 * @package Moonrock
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueue child theme stylesheet.
 *
 * Loads after the parent XStore theme. The child style.css contains
 * custom CSS for cards, Flight Plan connector lines, glow effects,
 * comparison table, Nova layout, footer, and reduced-motion support.
 *
 * @return void
 */
function moonrock_enqueue_styles(): void {
	$parent_style = 'xstore-style';

	wp_enqueue_style(
		$parent_style,
		get_template_directory_uri() . '/style.css',
		array(),
		wp_get_theme()->parent()->get( 'Version' )
	);

	wp_enqueue_style(
		'moonrock-child-style',
		get_stylesheet_directory_uri() . '/style.css',
		array( $parent_style ),
		wp_get_theme()->get( 'Version' )
	);

	if ( is_front_page() || is_page_template( 'template-moonrock-homepage.php' ) ) {
		wp_enqueue_style(
			'moonrock-homepage',
			get_stylesheet_directory_uri() . '/assets/css/moonrock-homepage.css',
			array( 'moonrock-child-style' ),
			'2.0.1'
		);

		wp_enqueue_script(
			'moonrock-homepage',
			get_stylesheet_directory_uri() . '/assets/js/moonrock-homepage.js',
			array(),
			'2.0.0',
			true
		);
	}
}
add_action( 'wp_enqueue_scripts', 'moonrock_enqueue_styles' );

/**
 * Add theme support for Elementor features.
 *
 * Declares support early so Elementor can use it during init.
 *
 * @return void
 */
function moonrock_elementor_support(): void {
	add_theme_support( 'elementor' );
}
add_action( 'after_setup_theme', 'moonrock_elementor_support' );

/**
 * Return a versioned child-theme asset URL.
 *
 * @param string $path Relative asset path.
 * @return string
 */
function moonrock_asset_url( string $path ): string {
	return get_stylesheet_directory_uri() . '/assets/' . ltrim( $path, '/' );
}

/**
 * Render the approved Moonrock Marketing homepage.
 *
 * The shortcode permits placement inside an Elementor Shortcode widget while
 * the page template provides a repository-controlled, zero-database fallback.
 *
 * @return string
 */
function moonrock_homepage_shortcode(): string {
	ob_start();
	require get_stylesheet_directory() . '/template-parts/moonrock-homepage-content.php';
	return (string) ob_get_clean();
}
add_shortcode( 'moonrock_homepage', 'moonrock_homepage_shortcode' );
