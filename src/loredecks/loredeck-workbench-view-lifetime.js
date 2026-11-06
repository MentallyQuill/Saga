/** Keep asynchronous view work separate from active-deck source ownership. */
export function createLoredeckWorkbenchViewLifetime() {
    let packId = null;
    let session = null;
    let view = 0;
    let request = 0;

    function captureSession() {
        return session ? { packId, session } : null;
    }

    function isSessionCurrent(token) {
        return !!session && !!token && token.packId === packId && token.session === session;
    }

    function invalidateView() {
        view++;
    }

    return {
        open(nextPackId) {
            packId = nextPackId;
            // Identity is unique even across same-pack reopens and lifetimes.
            session = {};
            invalidateView();
        },
        invalidateView,
        close() {
            session = null;
            packId = null;
            invalidateView();
        },
        captureSession,
        isSessionCurrent,
        captureView(host) {
            const owner = captureSession();
            return owner && host ? { ...owner, view, host } : null;
        },
        isViewCurrent(token) {
            return isSessionCurrent(token) && token.view === view && !!token.host?.isConnected;
        },
        beginSource(sourcePackId, ownerSession = captureSession()) {
            // Reject stale save callbacks before they can supersede a current
            // request, including callbacks from an earlier open of this deck.
            if (sourcePackId !== packId || !isSessionCurrent(ownerSession)) return null;
            request++;
            return { ...captureSession(), request };
        },
        isSourceCurrent(token) {
            return isSessionCurrent(token) && token.request === request;
        },
    };
}
