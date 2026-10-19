/** One journey shared by the visible scene controls. Timers cannot outlive a reset. */
export function createSceneJourney({ onStage, onOpen, delay = () => 650, schedule = (run, ms) => setTimeout(run, ms), unschedule = (id) => clearTimeout(id), }) {
    let stage = "enter";
    let timer;
    let revision = 0;
    const cancelTimer = () => {
        revision += 1;
        if (timer !== undefined)
            unschedule(timer);
        timer = undefined;
    };
    const update = (next) => {
        if (next === stage)
            return;
        stage = next;
        onStage(stage);
    };
    const approach = () => {
        cancelTimer();
        update("table");
    };
    const openMenu = () => {
        approach();
        onOpen();
    };
    const scan = () => {
        if (stage !== "table")
            return;
        cancelTimer();
        update("scan");
        const ticket = revision;
        timer = schedule(() => {
            if (ticket !== revision || stage !== "scan")
                return;
            timer = undefined;
            update("table");
            onOpen();
        }, delay());
    };
    return {
        activate: () => (stage === "enter" ? approach() : scan()),
        approach,
        openMenu,
        reset: () => {
            cancelTimer();
            update("enter");
        },
        cancelScan: () => {
            cancelTimer();
            if (stage === "scan")
                update("table");
        },
        dispose: cancelTimer,
    };
}
