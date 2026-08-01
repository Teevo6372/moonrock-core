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

		wp_enqueue_style(
			'moonrock-nova-chat',
			get_stylesheet_directory_uri() . '/assets/css/moonrock-nova-chat.css',
			array( 'moonrock-homepage' ),
			'1.0.0'
		);

		wp_enqueue_script(
			'moonrock-homepage',
			get_stylesheet_directory_uri() . '/assets/js/moonrock-homepage.js',
			array(),
			'2.0.0',
			true
		);

		wp_enqueue_script(
			'moonrock-nova-chat',
			get_stylesheet_directory_uri() . '/assets/js/moonrock-nova-chat.js',
			array(),
			'1.0.0',
			true
		);

		wp_localize_script(
			'moonrock-nova-chat',
			'MoonrockNovaConfig',
			array(
				'runtimeUrl' => esc_url_raw(
					(string) apply_filters(
						'moonrock_nova_runtime_url',
						'https://moonrock-core-staging.up.railway.app'
					)
				),
				'pagePath'   => wp_parse_url( home_url( add_query_arg( array() ) ), PHP_URL_PATH ) ?: '/',
			)
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

/**
 * Route existing Nova calls-to-action to the runtime-powered modal.
 *
 * @return string
 */
function moonrock_homepage_nova_modal_url(): string {
	return '#nova-chat';
}
add_filter( 'moonrock_nova_url', 'moonrock_homepage_nova_modal_url' );

/**
 * Render the hidden Nova staging client without changing homepage layout.
 *
 * @return void
 */
function moonrock_render_nova_chat(): void {
	if ( ! is_front_page() && ! is_page_template( 'template-moonrock-homepage.php' ) ) {
		return;
	}
	?>
	<div class="mr-nova-chat" id="nova-chat" hidden aria-hidden="true">
		<div class="mr-nova-chat__backdrop" data-nova-close></div>
		<section class="mr-nova-chat__panel" role="dialog" aria-modal="true" aria-labelledby="mr-nova-chat-title">
			<header class="mr-nova-chat__header">
				<div>
					<span><?php esc_html_e( 'NOVA / VIRTUAL GROWTH ADVISOR', 'moonrock' ); ?></span>
					<h2 id="mr-nova-chat-title"><?php esc_html_e( 'Talk it through with Nova.', 'moonrock' ); ?></h2>
				</div>
				<button type="button" class="mr-nova-chat__close" data-nova-close aria-label="<?php esc_attr_e( 'Close Nova chat', 'moonrock' ); ?>">×</button>
			</header>
			<div class="mr-nova-chat__notice">
				<?php esc_html_e( 'Staging preview: Nova is using a mock model and cannot make live account changes.', 'moonrock' ); ?>
			</div>
			<div class="mr-nova-chat__conversation" data-nova-conversation aria-live="polite"></div>
			<p class="mr-nova-chat__status" data-nova-status role="status"></p>
			<form class="mr-nova-chat__form" data-nova-form>
				<label class="screen-reader-text" for="mr-nova-message"><?php esc_html_e( 'Message Nova', 'moonrock' ); ?></label>
				<textarea id="mr-nova-message" data-nova-input rows="3" maxlength="2000" placeholder="<?php esc_attr_e( 'Tell Nova where your business is today…', 'moonrock' ); ?>" required></textarea>
				<button class="mr-button" type="submit"><?php esc_html_e( 'Send', 'moonrock' ); ?> <span aria-hidden="true">↗</span></button>
			</form>
		</section>
	</div>
	<?php
}
add_action( 'wp_footer', 'moonrock_render_nova_chat', 30 );
