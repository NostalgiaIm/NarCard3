#include <errno.h>
#include <process.h>
#include <stdio.h>
#include <stdlib.h>

/*
 * GNU windres 2.44 can mis-handle Tauri's UTF-8 resource script when its
 * preprocessor output is read through a Windows pipe. This tiny launcher adds
 * --use-temp-file and otherwise forwards every argument unchanged.
 */
int main(int argc, char **argv) {
    const char *windres = getenv("NARCARD_REAL_WINDRES");
    if (windres == NULL || windres[0] == '\0') {
        fputs("NarCard: NARCARD_REAL_WINDRES is not set.\n", stderr);
        return 1;
    }

    char **child_argv = (char **)malloc((size_t)(argc + 2) * sizeof(char *));
    if (child_argv == NULL) {
        fputs("NarCard: unable to allocate windres argument list.\n", stderr);
        return 1;
    }

    child_argv[0] = (char *)windres;
    child_argv[1] = "--use-temp-file";
    for (int index = 1; index < argc; ++index) {
        child_argv[index + 1] = argv[index];
    }
    child_argv[argc + 1] = NULL;

    int result = _spawnv(_P_WAIT, windres, (const char *const *)child_argv);
    if (result == -1) {
        fprintf(stderr, "NarCard: unable to start real windres (errno %d).\n", errno);
    }
    free(child_argv);
    return result == -1 ? 1 : result;
}
