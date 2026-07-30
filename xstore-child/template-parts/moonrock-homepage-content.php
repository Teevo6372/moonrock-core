<?php
/**
 * Approved ChatGPT Sites homepage content.
 *
 * @package Moonrock
 */

defined( 'ABSPATH' ) || exit;

$flight_plan_url = (string) apply_filters( 'moonrock_flight_plan_url', 'https://api.leadconnectorhq.com/widget/booking/CdHRDV6t85OcYrE6FMl9' );
$nova_url        = (string) apply_filters( 'moonrock_nova_url', home_url( '/contact/' ) );
$growth_url      = home_url( '/growth/' );
$startups_url    = home_url( '/startups/' );
$shop_url        = home_url( '/shop/' );

$arrow = '<span aria-hidden="true">↗</span>';
?>
<section class="mr-hero mr-grid-bg" aria-labelledby="mr-home-heading">
	<div class="mr-orb mr-orb-a" aria-hidden="true"></div>
	<div class="mr-orb mr-orb-b" aria-hidden="true"></div>
	<div class="mr-wrap mr-hero-grid">
		<div class="mr-hero-copy">
			<p class="mr-eyebrow"><span aria-hidden="true"></span><?php esc_html_e( 'Your business growth partner', 'moonrock' ); ?></p>
			<h1 id="mr-home-heading"><?php esc_html_e( 'Helping Your Business Move Forward', 'moonrock' ); ?> <em><?php esc_html_e( 'with Confidence.', 'moonrock' ); ?></em></h1>
			<p class="mr-lead"><?php esc_html_e( 'Whether you’re launching your first business, trying to attract more customers, or looking for smarter ways to grow, Moonrock gives you a clear path forward.', 'moonrock' ); ?></p>
			<div class="mr-actions">
				<a class="mr-button" href="<?php echo esc_url( $flight_plan_url ); ?>"><?php esc_html_e( 'Build My Flight Plan', 'moonrock' ); ?> <?php echo wp_kses_post( $arrow ); ?></a>
				<a class="mr-button mr-button-secondary" href="<?php echo esc_url( $nova_url ); ?>"><?php esc_html_e( 'Chat with Nova', 'moonrock' ); ?> <?php echo wp_kses_post( $arrow ); ?></a>
			</div>
			<div class="mr-trust" aria-label="<?php esc_attr_e( 'Who Moonrock serves', 'moonrock' ); ?>">
				<span><?php esc_html_e( 'Built for Startups', 'moonrock' ); ?></span>
				<span><?php esc_html_e( 'Built for Small Businesses', 'moonrock' ); ?></span>
				<span><?php esc_html_e( 'Built for Growing Teams', 'moonrock' ); ?></span>
			</div>
		</div>
		<div class="mr-nova-hero-card">
			<img src="<?php echo esc_url( moonrock_asset_url( 'images/nova-hero.webp' ) ); ?>" width="896" height="1200" alt="<?php esc_attr_e( 'Nova, Moonrock’s Virtual Growth Advisor', 'moonrock' ); ?>" fetchpriority="high" decoding="async">
			<div class="mr-nova-hero-shade" aria-hidden="true"></div>
			<div class="mr-nova-hero-status">
				<div class="mr-status-line"><span><?php esc_html_e( 'NOVA / VIRTUAL GROWTH ADVISOR', 'moonrock' ); ?></span><b><?php esc_html_e( '● ONLINE', 'moonrock' ); ?></b></div>
				<h2><?php esc_html_e( 'Clear guidance starts here.', 'moonrock' ); ?></h2>
				<p><?php esc_html_e( 'Tell Nova where your business is today.', 'moonrock' ); ?></p>
			</div>
		</div>
	</div>
</section>

<section class="mr-section" aria-labelledby="mr-recognition-heading">
	<div class="mr-wrap">
		<p class="mr-eyebrow"><span aria-hidden="true"></span><?php esc_html_e( 'Sound familiar?', 'moonrock' ); ?></p>
		<div class="mr-section-head">
			<h2 id="mr-recognition-heading"><?php esc_html_e( 'Growth shouldn’t feel like guesswork.', 'moonrock' ); ?></h2>
			<p><?php esc_html_e( 'Most business owners don’t need more noise. They need clarity about what matters now.', 'moonrock' ); ?></p>
		</div>
		<div class="mr-cards mr-cards-three">
			<article class="mr-card"><span class="mr-card-no">01</span><h3><?php esc_html_e( 'Too many options', 'moonrock' ); ?></h3><p><?php esc_html_e( 'Every expert points in a different direction.', 'moonrock' ); ?></p></article>
			<article class="mr-card"><span class="mr-card-no">02</span><h3><?php esc_html_e( 'Not enough momentum', 'moonrock' ); ?></h3><p><?php esc_html_e( 'Marketing and systems still feel disconnected.', 'moonrock' ); ?></p></article>
			<article class="mr-card"><span class="mr-card-no">03</span><h3><?php esc_html_e( 'No clear next step', 'moonrock' ); ?></h3><p><?php esc_html_e( 'You need practical priorities, not another list.', 'moonrock' ); ?></p></article>
		</div>
	</div>
</section>

<section class="mr-section mr-section-alt" aria-labelledby="mr-path-heading">
	<div class="mr-wrap">
		<div class="mr-section-head">
			<div><p class="mr-eyebrow"><span aria-hidden="true"></span><?php esc_html_e( 'Choose your path', 'moonrock' ); ?></p><h2 id="mr-path-heading"><?php esc_html_e( 'Start where your business is today.', 'moonrock' ); ?></h2></div>
			<p><?php esc_html_e( 'Moonrock meets you at your current stage, then helps you make the next right move.', 'moonrock' ); ?></p>
		</div>
		<div class="mr-cards mr-cards-three mr-journey">
			<article class="mr-card"><span><?php esc_html_e( 'STARTING', 'moonrock' ); ?></span><h3><?php esc_html_e( 'Launch a strong foundation.', 'moonrock' ); ?></h3><p><?php esc_html_e( 'Turn an idea into a focused business with the right offer, message, and operating basics.', 'moonrock' ); ?></p><a class="mr-button" href="<?php echo esc_url( $startups_url ); ?>"><?php esc_html_e( 'Explore', 'moonrock' ); ?> <?php echo wp_kses_post( $arrow ); ?></a></article>
			<article class="mr-card"><span><?php esc_html_e( 'GROWING', 'moonrock' ); ?></span><h3><?php esc_html_e( 'Build sustainable momentum.', 'moonrock' ); ?></h3><p><?php esc_html_e( 'Connect your marketing, sales, and systems around the gaps slowing growth.', 'moonrock' ); ?></p><a class="mr-button" href="<?php echo esc_url( $growth_url ); ?>"><?php esc_html_e( 'Explore', 'moonrock' ); ?> <?php echo wp_kses_post( $arrow ); ?></a></article>
			<article class="mr-card"><span><?php esc_html_e( 'NEED CLARITY', 'moonrock' ); ?></span><h3><?php esc_html_e( 'Talk it through with Nova.', 'moonrock' ); ?></h3><p><?php esc_html_e( 'Get practical guidance and a recommendation for the most useful next step.', 'moonrock' ); ?></p><a class="mr-button" href="<?php echo esc_url( $nova_url ); ?>"><?php esc_html_e( 'Explore', 'moonrock' ); ?> <?php echo wp_kses_post( $arrow ); ?></a></article>
		</div>
	</div>
</section>

<section class="mr-section mr-section-dark" id="flight-plan" aria-labelledby="mr-flight-heading">
	<div class="mr-wrap">
		<div class="mr-section-head">
			<div><p class="mr-eyebrow"><span aria-hidden="true"></span><?php esc_html_e( 'The Moonrock Flight Plan™', 'moonrock' ); ?></p><h2 id="mr-flight-heading"><?php esc_html_e( 'A clear path from uncertainty to momentum.', 'moonrock' ); ?></h2></div>
			<p><?php esc_html_e( 'No two businesses start from the same place. Your Flight Plan turns your current reality into a practical sequence of next moves.', 'moonrock' ); ?></p>
		</div>
		<div class="mr-flight-line">
			<article><b>01</b><i aria-hidden="true"></i><h3><?php esc_html_e( 'Discover', 'moonrock' ); ?></h3><p><?php esc_html_e( 'Understand where you are and what needs attention.', 'moonrock' ); ?></p></article>
			<article><b>02</b><i aria-hidden="true"></i><h3><?php esc_html_e( 'Navigate', 'moonrock' ); ?></h3><p><?php esc_html_e( 'Choose the right priorities and remove the noise.', 'moonrock' ); ?></p></article>
			<article><b>03</b><i aria-hidden="true"></i><h3><?php esc_html_e( 'Launch', 'moonrock' ); ?></h3><p><?php esc_html_e( 'Put the right foundation, message, and systems into motion.', 'moonrock' ); ?></p></article>
			<article><b>04</b><i aria-hidden="true"></i><h3><?php esc_html_e( 'Accelerate', 'moonrock' ); ?></h3><p><?php esc_html_e( 'Build momentum with improvements that compound.', 'moonrock' ); ?></p></article>
			<article><b>05</b><i aria-hidden="true"></i><h3><?php esc_html_e( 'Horizon', 'moonrock' ); ?></h3><p><?php esc_html_e( 'Measure what matters and prepare for what comes next.', 'moonrock' ); ?></p></article>
		</div>
	</div>
</section>

<section class="mr-section mr-nova" aria-labelledby="mr-nova-heading">
	<div class="mr-wrap mr-nova-grid">
		<figure class="mr-nova-portrait">
			<img src="<?php echo esc_url( moonrock_asset_url( 'images/nova-profile.webp' ) ); ?>" width="896" height="1200" alt="<?php esc_attr_e( 'Nova, Moonrock’s Virtual Growth Advisor', 'moonrock' ); ?>" loading="lazy" decoding="async">
			<figcaption><b>NOVA</b><span><?php esc_html_e( 'VIRTUAL GROWTH ADVISOR', 'moonrock' ); ?></span></figcaption>
		</figure>
		<div>
			<p class="mr-eyebrow"><span aria-hidden="true"></span><?php esc_html_e( 'Meet Nova', 'moonrock' ); ?></p>
			<h2 id="mr-nova-heading"><?php esc_html_e( 'Your first conversation can be the clearest one.', 'moonrock' ); ?></h2>
			<p class="mr-lead"><?php esc_html_e( 'Nova is Moonrock’s Virtual Growth Advisor—a calm, practical guide to help you understand your options and decide what comes next.', 'moonrock' ); ?></p>
			<ul class="mr-check-list"><li><?php esc_html_e( 'Clarify the challenge in front of you', 'moonrock' ); ?></li><li><?php esc_html_e( 'Recommend the right Flight Plan or resource', 'moonrock' ); ?></li><li><?php esc_html_e( 'Connect you with a specialist when it makes sense', 'moonrock' ); ?></li></ul>
			<a class="mr-button" href="<?php echo esc_url( $nova_url ); ?>"><?php esc_html_e( 'Chat with Nova', 'moonrock' ); ?> <?php echo wp_kses_post( $arrow ); ?></a>
		</div>
	</div>
</section>

<section class="mr-section mr-section-alt" aria-labelledby="mr-hub-heading">
	<div class="mr-wrap">
		<div class="mr-section-head">
			<div><p class="mr-eyebrow"><span aria-hidden="true"></span><?php esc_html_e( 'The Growth Hub', 'moonrock' ); ?></p><h2 id="mr-hub-heading"><?php esc_html_e( 'Practical tools for the work ahead.', 'moonrock' ); ?></h2></div>
			<a class="mr-button mr-button-secondary" href="<?php echo esc_url( $shop_url ); ?>"><?php esc_html_e( 'Explore the Hub', 'moonrock' ); ?> <?php echo wp_kses_post( $arrow ); ?></a>
		</div>
		<div class="mr-cards mr-cards-four">
			<?php foreach ( array( 'Startup Resources', 'Growth Resources', 'Marketing Tools', 'Business Systems' ) as $index => $resource ) : ?>
				<article class="mr-card mr-resource"><span><?php echo esc_html( '0' . ( $index + 1 ) ); ?></span><h3><?php echo esc_html( $resource ); ?></h3><p><?php esc_html_e( 'Focused guides, templates, and playbooks built to help you make progress.', 'moonrock' ); ?></p><a href="<?php echo esc_url( $shop_url ); ?>"><?php esc_html_e( 'Explore collection', 'moonrock' ); ?> <?php echo wp_kses_post( $arrow ); ?></a></article>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<section class="mr-final-cta" aria-labelledby="mr-final-heading">
	<div class="mr-wrap">
		<p class="mr-eyebrow mr-eyebrow-center"><span aria-hidden="true"></span><?php esc_html_e( 'Your next move', 'moonrock' ); ?></p>
		<h2 id="mr-final-heading"><?php esc_html_e( 'Your business deserves a clear direction.', 'moonrock' ); ?></h2>
		<p><?php esc_html_e( 'Start with a personalized Flight Plan or talk with Nova. No pressure. Just practical guidance built around where you are now.', 'moonrock' ); ?></p>
		<div class="mr-actions mr-actions-center">
			<a class="mr-button" href="<?php echo esc_url( $flight_plan_url ); ?>"><?php esc_html_e( 'Build My Flight Plan', 'moonrock' ); ?> <?php echo wp_kses_post( $arrow ); ?></a>
			<a class="mr-button mr-button-secondary" href="<?php echo esc_url( $nova_url ); ?>"><?php esc_html_e( 'Chat with Nova', 'moonrock' ); ?> <?php echo wp_kses_post( $arrow ); ?></a>
		</div>
	</div>
</section>
