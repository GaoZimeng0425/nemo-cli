#!/bin/bash

# NPM Publishing Helper Script
# This script helps automate the npm publishing process

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if npm token is set
check_npm_token() {
    if [ -z "$NPM_TOKEN" ]; then
        log_error "NPM_TOKEN environment variable is not set"
        log_info "Set it with: export NPM_TOKEN=your_token_here"
        exit 1
    fi
    log_success "NPM_TOKEN is set"
}

# Verify we're on main branch
check_branch() {
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$BRANCH" != "main" ]; then
        log_warning "You are not on main branch (current: $BRANCH)"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Aborted"
            exit 1
        fi
    fi
}

# Check if working directory is clean
check_clean() {
    if [ -n "$(git status --porcelain)" ]; then
        log_error "Working directory is not clean"
        log_info "Commit or stash changes first"
        git status
        exit 1
    fi
    log_success "Working directory is clean"
}

# Build all packages
build_packages() {
    log_info "Building all packages..."
    pnpm run build

    if [ $? -ne 0 ]; then
        log_error "Build failed"
        exit 1
    fi
    log_success "Build completed successfully"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    pnpm run test

    if [ $? -ne 0 ]; then
        log_warning "Tests failed, but continuing..."
    else
        log_success "All tests passed"
    fi
}

# Type check
type_check() {
    log_info "Running type check..."
    pnpm run check

    if [ $? -ne 0 ]; then
        log_warning "Type check failed, but continuing..."
    else
        log_success "Type check passed"
    fi
}

# Update version numbers
update_versions() {
    VERSION=$1

    if [ -z "$VERSION" ]; then
        log_error "Version is required"
        exit 1
    fi

    log_info "Updating version to $VERSION..."
    pnpm --filter "@nemo-cli/*" exec -- pnpm version $VERSION --no-git-tag-version
    log_success "Version updated to $VERSION"
}

# Publish packages
publish_packages() {
    DRY_RUN=$1

    if [ "$DRY_RUN" = "true" ]; then
        log_info "Publishing packages (dry-run)..."
        pnpm --filter "@nemo-cli/shared" exec -- npm publish --dry-run
        pnpm --filter "@nemo-cli/ui" exec -- npm publish --dry-run
        pnpm --filter "@nemo-cli/git" exec -- npm publish --dry-run
        log_success "Dry-run completed successfully"
    else
        log_info "Publishing packages to npm..."

        # Publish in dependency order
        pnpm --filter "@nemo-cli/shared" exec -- npm publish
        pnpm --filter "@nemo-cli/ui" exec -- npm publish
        pnpm --filter "@nemo-cli/git" exec -- npm publish

        log_success "All packages published successfully!"
    fi
}

# Create git tag
create_tag() {
    VERSION=$1

    log_info "Creating git tag v$VERSION..."
    git tag "v$VERSION"
    git push origin main --tags
    log_success "Tag v$VERSION created and pushed"
}

# Main menu
show_menu() {
    echo ""
    echo "======================================"
    echo "  NPM Publishing Helper"
    echo "======================================"
    echo ""
    echo "1) Quick publish (version → build → tag → push)"
    echo "2) Dry run only"
    echo "3) Update version only"
    echo "4) Build only"
    echo "5) Create tag only"
    echo "6) Publish to npm (manual)"
    echo "7) Full publish without tag"
    echo "0) Exit"
    echo ""
    read -p "Select option: " choice
    echo $choice
}

# Quick publish flow
quick_publish() {
    log_info "Starting quick publish flow..."

    check_branch
    check_clean

    read -p "Enter version (e.g., 0.1.3): " VERSION
    update_versions "$VERSION"

    git add .
    git commit -m "chore: bump version to $VERSION"

    build_packages
    run_tests
    type_check

    create_tag "$VERSION"

    log_success "Quick publish completed! GitHub Actions will handle publishing."
}

# Main execution
main() {
    case "${1:-menu}" in
        "menu")
            while true; do
                CHOICE=$(show_menu)
                case $CHOICE in
                    1) quick_publish; break ;;
                    2)
                        read -p "Enter version (e.g., 0.1.3): " VERSION
                        update_versions "$VERSION"
                        build_packages
                        publish_packages "true"
                        break
                        ;;
                    3)
                        read -p "Enter version (e.g., 0.1.3): " VERSION
                        update_versions "$VERSION"
                        ;;
                    4) build_packages ;;
                    5)
                        read -p "Enter version (e.g., 0.1.3): " VERSION
                        create_tag "$VERSION"
                        ;;
                    6)
                        read -p "Dry run? (y/N): " -n 1 -r
                        echo
                        DRY_RUN=$([[ $REPLY =~ ^[Yy]$ ]] && echo "true" || echo "false")
                        publish_packages "$DRY_RUN"
                        ;;
                    7)
                        check_npm_token
                        check_branch
                        check_clean
                        build_packages
                        run_tests
                        type_check
                        read -p "Dry run? (y/N): " -n 1 -r
                        echo
                        DRY_RUN=$([[ $REPLY =~ ^[Yy]$ ]] && echo "true" || echo "false")
                        publish_packages "$DRY_RUN"
                        ;;
                    0) log_info "Exiting..."; exit 0 ;;
                    *) log_error "Invalid option"; exit 1 ;;
                esac
            done
            ;;
        "quick")
            quick_publish
            ;;
        "dry-run")
            if [ -z "$2" ]; then
                log_error "Version is required for dry-run"
                exit 1
            fi
            update_versions "$2"
            build_packages
            publish_packages "true"
            ;;
        *)
            echo "Usage: $0 [quick|dry-run|menu]"
            echo ""
            echo "Commands:"
            echo "  quick      - Quick publish flow (interactive)"
            echo "  dry-run    - Dry run publish"
            echo "  menu       - Show interactive menu (default)"
            exit 1
            ;;
    esac
}

main "$@"
