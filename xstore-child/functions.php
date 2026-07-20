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
