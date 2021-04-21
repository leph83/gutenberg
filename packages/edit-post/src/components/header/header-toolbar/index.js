/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { useViewportMatch } from '@wordpress/compose';
import { useSelect, useDispatch } from '@wordpress/data';
import { __, _x } from '@wordpress/i18n';
import {
	BlockToolbar,
	NavigableToolbar,
	ToolSelector,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	TableOfContents,
	EditorHistoryRedo,
	EditorHistoryUndo,
	store as editorStore,
} from '@wordpress/editor';
import {
	Button,
	DropdownMenu,
	ToolbarItem,
	MenuItemsChoice,
	MenuGroup,
} from '@wordpress/components';
import { listView, plus } from '@wordpress/icons';
import { useRef } from '@wordpress/element';
import { store as keyboardShortcutsStore } from '@wordpress/keyboard-shortcuts';

/**
 * Internal dependencies
 */
import TemplateTitle from '../template-title';
import { store as editPostStore } from '../../../store';

function HeaderToolbar() {
	const inserterButton = useRef();
	const { setIsInserterOpened, setIsListViewOpened } = useDispatch(
		editPostStore
	);
	const {
		hasFixedToolbar,
		isInserterEnabled,
		isInserterOpened,
		isTextModeEnabled,
		previewDeviceType,
		showIconLabels,
		isNavigationTool,
		isTemplateMode,
		isListViewOpen,
		listViewShortcut,
	} = useSelect( ( select ) => {
		const {
			hasInserterItems,
			getBlockRootClientId,
			getBlockSelectionEnd,
			isNavigationMode,
		} = select( blockEditorStore );
		const { getEditorSettings } = select( editorStore );
		const {
			getEditorMode,
			isEditingTemplate,
			isFeatureActive,
			isListViewOpened,
			__experimentalGetPreviewDeviceType,
		} = select( editPostStore );
		const { getShortcutRepresentation } = select( keyboardShortcutsStore );

		return {
			hasFixedToolbar: isFeatureActive( 'fixedToolbar' ),
			// This setting (richEditingEnabled) should not live in the block editor's setting.
			isInserterEnabled:
				getEditorMode() === 'visual' &&
				getEditorSettings().richEditingEnabled &&
				hasInserterItems(
					getBlockRootClientId( getBlockSelectionEnd() )
				),
			isInserterOpened: select( editPostStore ).isInserterOpened(),
			isTextModeEnabled: getEditorMode() === 'text',
			previewDeviceType: __experimentalGetPreviewDeviceType(),
			showIconLabels: isFeatureActive( 'showIconLabels' ),
			isNavigationTool: isNavigationMode(),
			isTemplateMode: isEditingTemplate(),
			isListViewOpen: isListViewOpened(),
			listViewShortcut: getShortcutRepresentation(
				'core/edit-post/toggle-list-view'
			),
		};
	}, [] );
	const isLargeViewport = useViewportMatch( 'medium' );
	const isWideViewport = useViewportMatch( 'wide' );
	const isSmallViewport = useViewportMatch( 'small', '<' );
	const { setNavigationMode } = useDispatch( blockEditorStore );

	const displayBlockToolbar =
		! isLargeViewport || previewDeviceType !== 'Desktop' || hasFixedToolbar;

	const toolbarAriaLabel = displayBlockToolbar
		? /* translators: accessibility text for the editor toolbar when Top Toolbar is on */
		  __( 'Document and block tools' )
		: /* translators: accessibility text for the editor toolbar when Top Toolbar is off */
		  __( 'Document tools' );

	const onSwitchMode = ( mode ) => {
		setNavigationMode( mode === 'edit' ? false : true );
	};

	const overflowItems = (
		<>
			<ToolbarItem
				as={ TableOfContents }
				hasOutlineItemsDisabled={ isTextModeEnabled }
				repositionDropdown={ showIconLabels && ! isWideViewport }
				showTooltip={ ! showIconLabels }
				isTertiary={ showIconLabels }
			/>
			<ToolbarItem
				as={ Button }
				className="edit-site-header-toolbar__list-view-toggle"
				icon={ listView }
				disabled={ isTextModeEnabled }
				isPressed={ isListViewOpen }
				/* translators: button label text should, if possible, be under 16 characters. */
				label={ __( 'List View' ) }
				onClick={ () => setIsListViewOpened( ! isListViewOpen ) }
				shortcut={ listViewShortcut }
				showTooltip={ ! showIconLabels }
			/>
		</>
	);

	return (
		<NavigableToolbar
			className="edit-post-header-toolbar"
			aria-label={ toolbarAriaLabel }
		>
			<div className="edit-post-header-toolbar__left">
				<ToolbarItem
					ref={ inserterButton }
					as={ Button }
					className="edit-post-header-toolbar__inserter-toggle"
					isPrimary
					isPressed={ isInserterOpened }
					onMouseDown={ ( event ) => {
						event.preventDefault();
					} }
					onClick={ () => {
						if ( isInserterOpened ) {
							// Focusing the inserter button closes the inserter popover
							inserterButton.current.focus();
						} else {
							setIsInserterOpened( true );
						}
					} }
					disabled={ ! isInserterEnabled }
					icon={ plus }
					/* translators: button label text should, if possible, be under 16
			characters. */
					label={ _x(
						'Toggle block inserter',
						'Generic label for block inserter button'
					) }
					showTooltip={ ! showIconLabels }
				>
					{ showIconLabels && __( 'Add' ) }
				</ToolbarItem>
				{ ( isWideViewport || ! showIconLabels ) && (
					<>
						{ isLargeViewport && (
							<ToolbarItem
								as={ ToolSelector }
								showTooltip={ ! showIconLabels }
								isTertiary={ showIconLabels }
								disabled={ isTextModeEnabled }
							/>
						) }
						<ToolbarItem
							as={ EditorHistoryUndo }
							showTooltip={ ! showIconLabels }
							isTertiary={ showIconLabels }
						/>
						<ToolbarItem
							as={ EditorHistoryRedo }
							showTooltip={ ! showIconLabels }
							isTertiary={ showIconLabels }
						/>
						{ overflowItems }
					</>
				) }
				{ ! isWideViewport && ! isSmallViewport && showIconLabels && (
					<DropdownMenu
						position="bottom right"
						label={
							/* translators: button label text should, if possible, be under 16
characters. */
							__( 'Tools' )
						}
					>
						{ () => (
							<div className="edit-post-header__dropdown">
								<MenuGroup label={ __( 'Modes' ) }>
									<MenuItemsChoice
										value={
											isNavigationTool ? 'select' : 'edit'
										}
										onSelect={ onSwitchMode }
										choices={ [
											{
												value: 'edit',
												label: __( 'Edit' ),
											},
											{
												value: 'select',
												label: __( 'Select' ),
											},
										] }
									/>
								</MenuGroup>
								<MenuGroup label={ __( 'Edit' ) }>
									<EditorHistoryUndo
										showTooltip={ ! showIconLabels }
										isTertiary={ showIconLabels }
									/>
									<EditorHistoryRedo
										showTooltip={ ! showIconLabels }
										isTertiary={ showIconLabels }
									/>
								</MenuGroup>
								<MenuGroup>{ overflowItems }</MenuGroup>
							</div>
						) }
					</DropdownMenu>
				) }
			</div>

			<TemplateTitle />

			{ displayBlockToolbar && (
				<div
					className={ classnames(
						'edit-post-header-toolbar__block-toolbar',
						{
							'is-pushed-down': isTemplateMode,
						}
					) }
				>
					<BlockToolbar hideDragHandle />
				</div>
			) }
		</NavigableToolbar>
	);
}

export default HeaderToolbar;
